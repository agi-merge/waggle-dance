// agent/strategy/callExecutionAgent.ts

import { type ChatOpenAI } from "langchain/chat_models/openai";
import { loadEvaluator } from "langchain/evaluation";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { type AgentStep } from "langchain/schema";
import { AbortError } from "redis";
import { v4 } from "uuid";
import { parse as yamlParse } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type ChainValues,
} from "../..";
import checkTrajectory, {
  getMinimumScoreFromEnv,
} from "../grounding/checkTrajectory";
import {
  createContextAndToolsPrompt,
  type ToolsAndContextPickingInput,
} from "../prompts/createContextAndToolsPrompt";
import { isTaskCriticism } from "../prompts/types";
import { invokeRewriteRunnable } from "../runnables/createRewriteRunnable";
import saveMemoriesSkill from "../skills/saveMemories";
import { LLM, LLM_ALIASES, ModelStyle } from "../utils/llms";
import { stringifyByMime } from "../utils/mimeTypeParser";
import { createEmbeddings, createModel } from "../utils/model";
import createSkills from "../utils/skills";
import {
  contextAndToolsOutputSchema,
  reActOutputSchema,
  type CallExecutionAgentProps,
} from "./execute/callExecutionAgent.types";
import { initializeExecutor } from "./execute/initializeAgentExecutor";

export async function callExecutionAgent(
  creation: CallExecutionAgentProps,
): Promise<string | Error> {
  const {
    goalId: _goalId,
    creationProps,
    goalPrompt,
    executionId,
    agentPromptingMethod,
    task,
    dag,
    revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
    abortSignal,
    namespace,
    contentType,
    lastToolInputs: _lastToolInputs,
    handlePacketCallback,
    agentProtocolOpenAPISpec,
    geo,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined; // prevent dupe callbacks- we don't want callbacks to be merged into all model creations
  const exeLLM = createModel(creationProps, agentPromptingMethod);

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

  const dagObj = yamlParse(dag) as DraftExecutionGraph;
  if ((!dagObj || !dagObj.nodes) && isCriticism) {
    throw new Error("DAG is required for criticism task");
  }
  const prompt = isCriticism
    ? createCriticizePrompt({
        revieweeTaskResults,
        goalPrompt,
        nodes: dagObj.nodes,
        namespace,
        returnType,
      })
    : createExecutePrompt({
        taskObj,
        executionId,
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
    agentProtocolOpenAPISpec,
    geo,
  );

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    task: `${taskObj.name}`,
    inServiceOfGoal: goalPrompt,
    // availableDataSources: [],
    availableTools: skills.map((s) => s.name),
  };

  const inputTaskAndGoalString = stringifyByMime(returnType, inputTaskAndGoal);

  const baseParser = StructuredOutputParser.fromZodSchema(
    contextAndToolsOutputSchema,
  );
  const outputFixingParser = OutputFixingParser.fromLLM(exeLLM, baseParser);

  const smallSmartHelperModel = createModel(
    {
      ...creationProps,
      modelName: LLM_ALIASES["smart-xlarge"],
      maxTokens: 300,
      maxConcurrency: 2,
    },
    ModelStyle.Chat,
  ) as ChatOpenAI;

  const contextPickingChain = createContextAndToolsPrompt({
    returnType,
    inputTaskAndGoalString,
  })
    .pipe(
      smallSmartHelperModel.bind({
        signal: abortSignal,
        runName: "Pick Context and Tools",
        tags: ["contextAndTools", ...tags],
        callbacks,
      }),
    )
    .pipe(outputFixingParser);

  const runId = v4();
  void handlePacketCallback({
    type: "handleToolStart",
    tool: {
      lc: 1,
      type: "not_implemented",
      id: ["Pick Context and Tools"],
    },
    input: inputTaskAndGoalString.slice(0, 100),
    runId,
  });

  const contextAndTools = await contextPickingChain.invoke(
    {},
    {
      tags: ["contextAndTools", ...tags],
      // callbacks,
      runName: "Pick Context and Tools",
    },
  );

  void handlePacketCallback({
    type: "handleToolEnd",
    lastToolInput: inputTaskAndGoalString,
    output: contextAndTools.tools?.join(", ") ?? "???",
    runId,
  });

  void handlePacketCallback({
    type: "contextAndTools",
    ...contextAndTools,
    runId,
  });

  console.debug(`contextAndTools(${taskObj.id}):`, contextAndTools);
  const formattedMessages = await prompt.formatMessages({
    synthesizedContext: contextAndTools.synthesizedContext?.join("\n") ?? "N/A",
  });

  // because AgentExecutor does not accept BaseMessages, we must render the messages into a single string
  const input: string = formattedMessages
    .map((m) => `[${m._getType()}]\n${m.content}`)
    .join("\n\n");

  // filter all available tools by the ones that were selected by the context and tools selection agent
  const filteredSkills = (contextAndTools.tools ?? []).flatMap((t) => {
    return skills.filter((s) => s.name === t);
  });
  // const filteredSkills = (contextAndTools.tools ?? []).flatMap((t) => {
  //   return _skills.filter((s) => s.name === t);
  // });

  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    filteredSkills,
    exeLLM,
    tags,
    memory, //FIXME: OpenAI Functions crashes when using conversation/buffer memory
  );

  try {
    const callRunId = v4();
    let call: ChainValues;
    try {
      const runName = isCriticism
        ? `Criticize Results ${taskObj.id}`
        : `Execute Task ${taskObj.id}`;
      void handlePacketCallback({
        type: "handleToolStart",
        input: taskObj.name,
        tool: isCriticism
          ? { lc: 1, type: "not_implemented", id: [runName] }
          : { lc: 1, type: "not_implemented", id: [runName] },
        runId: callRunId,
      });
      call = await executor.call(
        {
          input,
          signal: abortSignal,
          tags,
          runName,
        },
        callbacks,
      );
      void handlePacketCallback({
        type: "handleToolEnd",
        lastToolInput: "…",
        output: stringifyByMime(returnType, call),
        runId: callRunId,
      });
    } catch (error) {
      if (error instanceof AbortError) {
        return error;
      }
      let errorMessageToParse =
        ((error as Error) && (error as Error).message) || String(error);
      const baseParser =
        StructuredOutputParser.fromZodSchema(reActOutputSchema);
      errorMessageToParse = errorMessageToParse.replaceAll(
        `
`,
        "\n",
      );
      const outputFixingParser = OutputFixingParser.fromLLM(exeLLM, baseParser);

      const errorFixingRunId = v4();
      void handlePacketCallback({
        type: "handleToolStart",
        input: inputTaskAndGoalString,
        runId: errorFixingRunId,
        tool: { lc: 1, type: "not_implemented", id: ["Fixing Response"] },
      });

      const finalAnswer = await outputFixingParser.invoke(errorMessageToParse, {
        tags: [...tags, "fix"],
        runName: "ReAct Error Fixing",
      });

      void handlePacketCallback({
        type: "handleToolEnd",
        lastToolInput: finalAnswer.action,
        output: finalAnswer.action,
        runId: errorFixingRunId,
      });

      call = { output: finalAnswer.action_input };
    }

    const response = call?.output ? (call.output as string) : "";
    const intermediateSteps = call.intermediateSteps as AgentStep[];

    if (isCriticism) {
      return response;
    }

    const rewriteRunId = v4();

    void handlePacketCallback({
      type: "handleToolStart",
      input: response.slice(0, 100),
      runId: rewriteRunId,
      tool: { lc: 1, type: "not_implemented", id: ["Rewrite"] },
    });

    void handlePacketCallback({
      type: "rewrite",
      runId: rewriteRunId,
    });

    const bestResponse = await invokeRewriteRunnable(response, {
      creationProps,
      abortSignal,
      taskObj,
      returnType,
      contextAndTools,
      intermediateSteps,
      memory,
      response,
      tags,
      callbacks,
    });

    void handlePacketCallback({
      type: "handleToolEnd",
      lastToolInput: inputTaskAndGoalString,
      output: bestResponse.slice(0, 100),
      runId: rewriteRunId,
    });

    // make sure that we are at least saving the task result so that other notes can refer back.
    const save: Promise<unknown> = saveMemoriesSkill.skill.func({
      memories: [bestResponse],
      namespace: namespace,
    });

    void save;

    const mediumSmartHelperModel = createModel(
      {
        ...creationProps,
        modelName: LLM_ALIASES["smart-xlarge"],
        maxTokens: 600,
        maxConcurrency: 2,
      },
      ModelStyle.Chat,
    ) as ChatOpenAI;

    const taskFulfillmentEvaluator = await loadEvaluator("trajectory", {
      llm: mediumSmartHelperModel,
      criteria: {
        taskFulfillment: "Does the submission fulfill the specific TASK?",
        schemaAdherence: "Does the submission utilize the relevant CONTEXT?",
        rulesObservance: "Does the submission respect each of the RULES?",
        temporalAwareness:
          "Does the submission show awareness of the TIME, relative to the given TASK and CONTEXT?",
      },
      agentTools: filteredSkills,
    });

    try {
      const evaluators = [taskFulfillmentEvaluator];

      const evaluationRunId = v4();
      const shouldEvaluate = getMinimumScoreFromEnv() !== null;
      shouldEvaluate &&
        void handlePacketCallback({
          type: "handleToolStart",
          input: bestResponse.slice(0, 100),
          runId: evaluationRunId,
          tool: { lc: 1, type: "not_implemented", id: ["Review"] },
        });

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

      shouldEvaluate &&
        void handlePacketCallback({
          type: "handleToolEnd",
          lastToolInput: inputTaskAndGoalString,
          output: bestResponse,
          runId: evaluationRunId,
        });
      return `${bestResponse}
### Evaluation:
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
