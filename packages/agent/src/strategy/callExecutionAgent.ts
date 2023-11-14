// agent/strategy/callExecutionAgent.ts
import { isAbortError } from "next/dist/server/pipe-readable";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { type Callbacks } from "langchain/callbacks";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type OpenAIToolType } from "langchain/dist/experimental/openai_assistant/schema";
import { type StructuredTool, type Tool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import { OpenAIAssistantRunnable } from "langchain/experimental/openai_assistant";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { type AgentStep, type MessageContent } from "langchain/schema";
import { v4 } from "uuid";
import { parse as yamlParse } from "yaml";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  extractTier,
  TaskState,
  type ChainValues,
  type MemoryType,
  type ModelCreationProps,
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
import retrieveMemoriesSkill from "../skills/retrieveMemories";
import saveMemoriesSkill from "../skills/saveMemories";
import {
  AgentPromptingMethod,
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  LLM_ALIASES,
  ModelStyle,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { stringifyByMime } from "../utils/mimeTypeParser";
import { createEmbeddings, createModel } from "../utils/model";
import createSkills from "../utils/skills";
import { type CallExecutionAgentProps } from "./execute/callExecutionAgent.types";

export interface FunctionDefinition {
  /**
   * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
   * underscores and dashes, with a maximum length of 64.
   */
  name: string;

  /**
   * The parameters the functions accepts, described as a JSON Schema object. See the
   * [guide](https://platform.openai.com/docs/guides/gpt/function-calling) for
   * examples, and the
   * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
   * documentation about the format.
   *
   * To describe a function that accepts no parameters, provide the value
   * `{"type": "object", "properties": {}}`.
   */
  parameters: Record<string, unknown>;

  /**
   * A description of what the function does, used by the model to choose when and
   * how to call the function.
   */
  description?: string;
}
export interface AssistantToolsFunction {
  function: FunctionDefinition;

  /**
   * The type of tool being defined: `function`
   */
  type: "function";
}
export function formatToOpenAIAssistantTool(
  tool: StructuredTool,
): AssistantToolsFunction {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.schema),
    },
  };
}

export type ContextAndTools = {
  synthesizedContext?: string[] | undefined;
  tools?: string[] | undefined;
};
// could be replaced with?
// https://js.langchain.com/docs/modules/chains/additional/openai_functions/tagging
const contextAndToolsOutputSchema = z.object({
  synthesizedContext: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
});
const reActOutputSchema = z.object({
  action: z.string(),
  action_input: z.string(),
});

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

  const _skills = createSkills(
    exeLLM,
    embeddings,
    agentPromptingMethod,
    isCriticism,
    taskObj.id,
    returnType,
    agentProtocolOpenAPISpec,
    geo,
  );

  const skills: OpenAIToolType = [
    ..._skills.map((s) => formatToOpenAIAssistantTool(s)),
    { type: "code_interpreter" },
    { type: "retrieval" },
  ];

  const taskAndGoal = {
    task: `${taskObj.name}`,
    inServiceOfGoal: goalPrompt,
  };

  let memories;
  // TODO: better way to check if we should retrieve memories
  if (extractTier(taskObj.id) !== "1") {
    const retrieveMemoriesRunId = v4(); // generate a new UUID for the runId

    void handlePacketCallback({
      type: "handleToolStart",
      input: "Retrieve Memories",
      runId: retrieveMemoriesRunId,
      tool: { lc: 1, type: "not_implemented", id: ["Retrieve Memories"] },
    });
    memories = await retrieveMemoriesSkill.skill.func({
      retrievals: [
        `What matches "${stringifyByMime(returnType, taskAndGoal)}"?`,
      ],
      namespace: namespace,
    });

    void handlePacketCallback({
      type: "handleToolEnd",
      lastToolInput: "Retrieve Memories",
      output: memories,
      runId: retrieveMemoriesRunId,
    });
  } else {
    memories = "None yet";
  }

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    ...taskAndGoal,
    longTermMemories: memories,
    // availableDataSources: [],
    availableTools: skills.map((s) => s.type),
  };

  const inputTaskAndGoalString = stringifyByMime(returnType, inputTaskAndGoal);

  const baseParser = StructuredOutputParser.fromZodSchema(
    contextAndToolsOutputSchema,
  );
  const outputFixingParser = OutputFixingParser.fromLLM(exeLLM, baseParser);

  const smallSmartHelperModel = createModel(
    {
      ...creationProps,
      modelName: LLM_ALIASES["fast-large"],
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
        runName: "Synthesize Context & Tools",
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
      id: ["Synthesize Context & Tools"],
    },
    input: inputTaskAndGoalString.slice(0, 100),
    runId,
  });

  const contextAndTools = await contextPickingChain.invoke(
    {},
    {
      tags: ["contextAndTools", ...tags],
      callbacks,
      runName: "Synthesize Context & Tools",
    },
  );

  void handlePacketCallback({
    type: "handleToolEnd",
    lastToolInput: inputTaskAndGoalString.slice(0, 100),
    output: stringifyByMime(returnType, contextAndTools),
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
  // slice only the first item if available and return array:
  const systemMessage = formattedMessages.slice(0, 1)[0]?.content;
  const humanMessage = formattedMessages.slice(1)[0]?.content;

  // filter all available tools by the ones that were selected by the context and tools selection agent
  const filteredSkills = (contextAndTools.tools ?? []).flatMap((t) => {
    return skills.filter((s) =>
      s.type === "function" ? t === s.function.name : s.type === t,
    );
  });
  // const filteredSkills = (contextAndTools.tools ?? []).flatMap((t) => {
  //   return _skills.filter((s) => s.name === t);
  // });

  const runName = isCriticism ? `Criticize ${taskObj.id}` : `Exe ${taskObj.id}`;
  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    filteredSkills,
    exeLLM,
    tags,
    memory,
    runName,
    systemMessage,
    humanMessage,
    callbacks,
  );

  let call: ChainValues | undefined;
  try {
    try {
      const callRunId = v4();

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

      if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
        call = await executor.invoke(
          {
            content: humanMessage!.toString(),
            file_ids: [],
          },
          {
            runName: `Exe ${taskObj.id}: ${taskObj.name.slice(0, 10)}`,
            tags,
            callbacks,
          },
        );
      } else {
        // combine all messages into a single input string
        const input: string = formattedMessages
          .map(
            (m) =>
              `[${m._getType().toUpperCase()}]\n${m.content}[/${m
                ._getType()
                .toUpperCase()}]`,
          )
          .join("\n\n");
        call = await executor.call(
          {
            input,
            signal: abortSignal,
            tags,
            runName: isCriticism ? "Criticize Results" : "Execute Task",
          },
          callbacks,
        );
      }

      void handlePacketCallback({
        type: "handleToolEnd",
        lastToolInput: taskObj.name,
        output: stringifyByMime(returnType, call),
        runId: callRunId,
      });
    } catch (error) {
      if (isAbortError(error)) {
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
    const intermediateSteps = call?.intermediateSteps as AgentStep[];

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

    void (async () => {
      const saveRunId = v4();
      await handlePacketCallback({
        type: "handleToolStart",
        input: bestResponse.slice(0, 100),
        runId: saveRunId,
        tool: {
          lc: 1,
          type: "not_implemented",
          id: ["Save to Long-term Memory"],
        },
      });
      // make sure that we are at least saving the task result so that other notes can refer back.
      const save: Promise<unknown> = saveMemoriesSkill.skill.func({
        memories: [bestResponse],
        namespace: namespace,
      });

      await save;

      await handlePacketCallback({
        type: "handleToolEnd",
        lastToolInput: bestResponse.slice(0, 100),
        output: bestResponse.slice(0, 100),
        runId: saveRunId,
      });
    })();

    const mediumSmartHelperModel = createModel(
      {
        ...creationProps,
        modelName: LLM_ALIASES["fast-large"],
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
      agentTools: [],
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
        humanMessage!.toString(),
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

async function initializeExecutor(
  _goalPrompt: string,
  agentPromptingMethod: AgentPromptingMethod,
  _taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: OpenAIToolType | StructuredTool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
  memory: MemoryType,
  runName: string,
  systemMessage: MessageContent | undefined,
  _humanMessage: MessageContent | undefined,
  callbacks: Callbacks | undefined,
) {
  let executor;
  const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
  let options:
    | InitializeAgentExecutorOptions
    | InitializeAgentExecutorOptionsStructured;

  // traditional agents do not support OpenAI Capabilities (Tools)
  const structuredTools = tools.filter(
    (t) => (t as StructuredTool) !== undefined,
  ) as StructuredTool[];
  if (
    InitializeAgentExecutorOptionsAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsAgentType,
    )
  ) {
    options = {
      agentType,
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      maxIterations: 15,
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
      maxIterations: 15,
      ...creationProps,
      callbacks,
      tags,
    } as InitializeAgentExecutorOptionsStructured;

    if (agentType !== "structured-chat-zero-shot-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      structuredTools,
      llm,
      options,
    );
  } else if (agentPromptingMethod === AgentPromptingMethod.PlanAndExecute) {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: structuredTools as Tool[],
      tags,
      callbacks,
    });
  } else {
    //if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
    const agent = await OpenAIAssistantRunnable.createAssistant({
      model: LLM_ALIASES["smart-xlarge"],
      instructions: systemMessage!.toString(),
      name: "Planning Agent",
      tools,
      asAgent: true,
    });

    agent.bind({
      callbacks,
      // signal: abortSignal,
      tags,
      runName,
    });

    // const parser = StructuredOutputParser.fromZodSchema(
    //   z.custom<PlanWireFormat>(),
    // );

    // const outputFixingParser = OutputFixingParser.fromLLM(llm, parser);

    executor = AgentExecutor.fromAgentAndTools({
      agent,
      memory,
      tools: structuredTools,
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      maxIterations: 15,
      ...creationProps,
      callbacks,
      tags,
      handleParsingErrors: true,
    }); //.pipe(outputFixingParser);
  }
  return executor;
}
