// agent/strategy/callExecutionAgent.ts

import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type StructuredTool, type Tool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { type AgentStep } from "langchain/schema";
import { stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { z } from "zod";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type MemoryType,
} from "../..";
import checkTrajectory from "../grounding/checkTrajectory";
import {
  createContextAndToolsPrompt,
  type ToolsAndContextPickingInput,
} from "../prompts/createContextAndToolsPrompt";
import { isTaskCriticism } from "../prompts/types";
import saveMemoriesSkill from "../skills/saveMemories";
import type Geo from "../utils/Geo";
import {
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  LLM_ALIASES,
  ModelStyle,
  type AgentPromptingMethod,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  goalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  namespace: string;
  geo?: Geo;
}): Promise<string | Error> {
  const {
    goalId: _goalId,
    creationProps,
    goalPrompt,
    agentPromptingMethod,
    task,
    dag,
    revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
    abortSignal,
    namespace,
    contentType,
    geo,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const exeLLM = createModel(creationProps, agentPromptingMethod);
  // TODO: refactor into its own agent type
  const smartHelperModel = createModel(
    { modelName: LLM_ALIASES["smart"] },
    ModelStyle.Chat,
  ) as ChatOpenAI;

  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = yamlParse(task) as {
    id: string;
    name: string;
    context: string;
  };
  const isCriticism = isTaskCriticism(taskObj.id);
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const memory = await createMemory({
    namespace,
    taskId: taskObj.id,
    returnUnderlying: false,
  });

  // methods need to be reattached
  const revieweeTaskResults = revieweeTaskResultsNeedDeserialization.map(
    (t) => new TaskState({ ...t }),
  );

  if (isCriticism && !revieweeTaskResults) {
    throw new Error("No result found to provide to review task");
  }

  const nodes = (yamlParse(dag) as DraftExecutionGraph).nodes;
  const prompt = isCriticism
    ? createCriticizePrompt({
        revieweeTaskResults,
        nodes,
        namespace,
        returnType,
      })
    : createExecutePrompt({
        taskObj,
        namespace,
        returnType,
        modelName: creationProps.modelName || LLM_ALIASES["fast"],
      });
  const tags = [
    isCriticism ? "criticize" : "execute",
    agentPromptingMethod,
    taskObj.id,
  ];
  namespace && tags.push(namespace);
  creationProps.modelName && tags.push(creationProps.modelName);

  const skills = createSkills(
    exeLLM,
    embeddings,
    agentPromptingMethod,
    isCriticism,
    taskObj.id,
    returnType,
    geo,
  );

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    task: `${taskObj.name}: ${taskObj.context}`,
    inServiceOfGoal: goalPrompt,
    // availableDataSources: [],
    availableTools: skills.map((s) => s.name),
  };

  const inputTaskAndGoalString =
    returnType === "JSON"
      ? jsonStringify(inputTaskAndGoal)
      : yamlStringify(inputTaskAndGoal);

  const outputSchema = z.object({
    synthesizedContext: z.record(z.string()),
    tools: z.array(z.string()),
  });
  const baseParser = StructuredOutputParser.fromZodSchema(outputSchema);
  const outputFixingParser = OutputFixingParser.fromLLM(exeLLM, baseParser);

  const contextPickingChain = createContextAndToolsPrompt({
    returnType,
    inputTaskAndGoalString,
  })
    .pipe(smartHelperModel)
    .pipe(outputFixingParser);

  const contextAndTools = await contextPickingChain.invoke(
    {},
    {
      tags: ["contextAndTools", ...tags],
      callbacks,
      runName: "Pick Context and Tools",
    },
  );

  console.debug(`contextAndTools(${taskObj.id}):`, contextAndTools);
  const formattedMessages = await prompt.formatMessages({
    synthesizedContext:
      returnType === "JSON"
        ? jsonStringify(contextAndTools.synthesizedContext)
        : yamlStringify(contextAndTools.synthesizedContext),
  });

  const input: string = formattedMessages
    .map((m) => `${m._getType()}: ${m.content}`)
    .join("\n");

  // filter all available tools by the ones that were selected by the context and tools selection agent

  const filteredSkills = contextAndTools.tools.flatMap((t) => {
    return skills.filter((s) => s.name === t);
  });

  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    filteredSkills,
    exeLLM,
    tags,
    memory,
  );

  try {
    const call = await executor.call(
      {
        input,
        signal: abortSignal,
        tags,
        runName: isCriticism ? "Criticize Results" : "Execute Task",
      },
      callbacks,
    );

    const response = call?.output ? (call.output as string) : "";
    const intermediateSteps = call.intermediateSteps as AgentStep[]; //.map(s => s.observation)

    if (isCriticism) {
      return response;
    }

    // const formattedIntermediateSteps = intermediateSteps.map(
    //   (s) => `  - ${s.observation}`,
    // );

    const chatHistory = (await memory?.loadMemoryVariables({
      input: taskObj.context,
    })) as { chat_history: { value?: string; message?: string } };

    const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(
      `You are an attentive, helpful, diligent, and expert executive assistant.`,
    );
    const rewriteResponseAck = `ack`;

    const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(
      `
# Task
${yamlStringify(contextAndTools.synthesizedContext)}
# Chat Log
${yamlStringify(
  chatHistory.chat_history.value ||
    chatHistory.chat_history.message ||
    chatHistory.chat_history,
)}
# Final Answer
${response}
================================================
If the Final Answer is already perfect, then only respond with "${rewriteResponseAck}" (without the quotes).
Rewrite the Final Answer to make it integrate all of the relevant information from Chat Log such that the Task is more completely fulfilled.
`,
    );
    const promptMessages = [systemMessagePrompt, humanMessagePrompt];

    const rewriteChain =
      ChatPromptTemplate.fromMessages(promptMessages).pipe(smartHelperModel);

    const rewriteResponse = await rewriteChain.invoke(
      {},
      {
        callbacks,
        runName: "Rewrite Response",
        tags: ["rewriteResponse", ...tags],
      },
    );

    const bestResponse =
      rewriteResponse.content === rewriteResponseAck
        ? response
        : rewriteResponse.content;

    // make sure that we are at least saving the task result so that other notes can refer back.
    const shouldSave = !isCriticism;
    const save: Promise<unknown> = shouldSave
      ? saveMemoriesSkill.skill.func({
          memories: [bestResponse],
          namespace: namespace,
        })
      : Promise.resolve(
          "skipping save memory due to error or this being a criticism task",
        );

    void save;

    const taskFulfillmentEvaluator = await loadEvaluator("trajectory", {
      llm: smartHelperModel,
      criteria: {
        taskFulfillment: "Does the submission fulfill the specific TASK?",
        schemaAdherence: "Does the submission adhere to the specified SCHEMA?",
        rulesAdherence: "Does the submission adhere to each of the RULES?",
      },
      agentTools: filteredSkills,
    });

    try {
      const evaluators = [taskFulfillmentEvaluator];

      const evaluationResult = await checkTrajectory(
        bestResponse,
        response,
        input,
        intermediateSteps,
        abortSignal,
        tags,
        callbacks,
        evaluators,
      );

      return `${bestResponse}

## Evaluation:
${evaluationResult}
`;
    } catch (error) {
      return error as Error;
    }
  } catch (error) {
    console.error(error);
    return error as Error;
  }
}

async function initializeExecutor(
  _goalPrompt: string,
  agentPromptingMethod: AgentPromptingMethod,
  _taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: StructuredTool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
  memory: MemoryType,
) {
  let executor;
  const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
  let options:
    | InitializeAgentExecutorOptions
    | InitializeAgentExecutorOptionsStructured;
  if (
    InitializeAgentExecutorOptionsAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsAgentType,
    )
  ) {
    options = {
      agentType,
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      maxIterations: 10,
      ...creationProps,
      tags,
      handleParsingErrors: true,
    } as InitializeAgentExecutorOptions;

    if (
      agentType !== "zero-shot-react-description" &&
      agentType !== "chat-zero-shot-react-description"
    ) {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      tools as Tool[],
      llm,
      options,
    );
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType,
      returnIntermediateSteps: true,
      earlyStoppingMethod: "generate",
      handleParsingErrors: true,
      maxIterations: 10,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptionsStructured;

    if (agentType !== "structured-chat-zero-shot-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: tools as Tool[],
      tags,
    });
  }
  return executor;
}
