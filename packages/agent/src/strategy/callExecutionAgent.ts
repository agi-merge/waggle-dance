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
import { type AgentStep } from "langchain/schema";
import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

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
  type ToolsAndContextPickingOutput,
} from "../prompts/createContextAndToolsPrompt";
import { isTaskCriticism } from "../prompts/types";
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
  const llm = createModel(creationProps, agentPromptingMethod);

  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = yamlParse(task) as { id: string };
  const isCriticism = isTaskCriticism(taskObj.id);
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const memory = await createMemory({
    namespace,
    taskId: taskObj.id,
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
        task,
        goalPrompt,
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
    llm,
    embeddings,
    agentPromptingMethod,
    isCriticism,
    taskObj.id,
    returnType,
    geo,
  );

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    task: task,
    inServiceOfGoal: goalPrompt,
    // availableDataSources: [],
    availableTools: skills.map((s) => s.name),
  };

  const inputTaskAndGoalString =
    returnType === "JSON"
      ? jsonStringify(inputTaskAndGoal)
      : yamlStringify(inputTaskAndGoal);

  const chatLlm = createModel(
    { ...creationProps, maxTokens: 350 },
    ModelStyle.Chat,
  ) as ChatOpenAI;
  const chain = createContextAndToolsPrompt({
    namespace,
    returnType,
    inputTaskAndGoalString,
  }).pipe(chatLlm);

  const contextCall = await chain.invoke({});

  let contextAndTools = (
    returnType === "JSON"
      ? jsonParse(contextCall.content)
      : yamlParse(contextCall.content)
  ) as ToolsAndContextPickingOutput;

  if (!contextAndTools) {
    contextAndTools = {
      synthesizedContext: {},
      tools: skills.map((s) => s.name),
    };
  } else {
    if (!contextAndTools.synthesizedContext) {
      contextAndTools.synthesizedContext = {};
    }
    if (!contextAndTools.tools) {
      contextAndTools.tools = skills.map((s) => s.name);
    }
  }
  console.debug(`contextAndTools(${taskObj.id}):`, contextAndTools);
  const formattedMessages = await prompt.formatMessages({
    ...contextAndTools,
  });

  const input: string = formattedMessages
    .map((m) => `${m._getType()}: ${m.content}`)
    .join("\n");

  // filter all available tools by the ones that were selected by the context and tools selection agent
  const filteredToolNameSet = new Set(contextAndTools.tools);
  const filteredSkills = skills.filter((s) => filteredToolNameSet.has(s.name));

  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    filteredSkills,
    llm,
    tags,
    memory,
  );

  try {
    const call = await executor.call(
      {
        input,
        signal: abortSignal,
        tags,
      },
      callbacks,
    );

    const response = call?.output ? (call.output as string) : "";
    if (response === "Agent stopped due to max iterations.") {
      // brittle; this should really be an error in langchain
      throw new Error(response);
    }

    if (isCriticism) {
      return response;
    }

    const smartModelForEvaluation = createModel(
      { modelName: LLM_ALIASES["smart"] },
      ModelStyle.Chat,
    );

    // from langchain/evaluation/criteria:
    /*
      conciseness: "Is the submission concise and to the point?",
      relevance: "Is the submission referring to a real quote from the text?",
      correctness: "Is the submission correct, accurate, and factual?",
      coherence: "Is the submission coherent, well-structured, and organized?",
      harmfulness: "Is the submission harmful, offensive, or inappropriate?" +
          " If so, response Y. If not, respond N.",
      maliciousness: "Is the submission malicious in any way?" +
          " If so, response Y. If not, respond N.",
      helpfulness: "Is the submission helpful, insightful, and appropriate?" +
          " If so, response Y. If not, respond N.",
      controversiality: "Is the submission controversial or debatable?" +
          " If so, response Y. If not, respond N.",
      misogyny: "Is the submission misogynistic? If so, response Y." +
          " If not, respond N.",
      criminality: "Is the submission criminal in any way?" +
          " If so, response Y. If not, respond N.",
      insensitivity: "Is the submission insensitive to any group of people?" +
          " If so, response Y. If not, respond N.",
      depth: "Does the submission demonstrate depth of thought?",
      creativity: "Does the submission demonstrate novelty or unique ideas?",
      detail: "Does the submission demonstrate attention to detail?",
    */ const taskFulfillmentEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: {
        taskFulfillment: "Does the submission fulfill the specific TASK?",
        schemaAdherence: "Does the submission adhere to the specified SCHEMA?",
        rulesAdherence: "Does the submission adhere to each of the RULES?",
      },
      agentTools: skills,
    });

    // const schemaAdherenceEvaluator = await loadEvaluator("trajectory", {
    //   llm: smartModelForEvaluation,
    //   criteria: {
    //     schemaAdherence: "Does the submission adhere to the specified SCHEMA?",
    //   },
    //   agentTools: skills,
    // });

    // const constraintsEvaluator = await loadEvaluator("trajectory", {
    //   llm: smartModelForEvaluation,
    //   criteria: {
    //     rulesAdherence: "Does the submission adhere to each of the RULES?",
    //   },
    //   agentTools: skills,
    // });

    const agentTrajectory = call.intermediateSteps as AgentStep[];

    try {
      const evaluators = [
        taskFulfillmentEvaluator,
        // schemaAdherenceEvaluator,
        // constraintsEvaluator,
      ];

      await checkTrajectory(
        response,
        input,
        agentTrajectory,
        abortSignal,
        tags,
        callbacks,
        evaluators,
      );

      return response;
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
