// agent/strategy/callExecutionAgent.ts
import { isAbortError } from "next/dist/server/pipe-readable";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type StructuredTool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import {
  OutputFixingParser,
  StructuredOutputParser,
} from "langchain/output_parsers";
import { type AgentStep } from "langchain/schema";
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
  LLM,
  LLM_ALIASES,
  ModelStyle,
} from "../utils/llms";
import { stringifyByMime } from "../utils/mimeTypeParser";
import { createEmbeddings, createModel } from "../utils/model";
import createSkills from "../utils/skills";
import { type CallExecutionAgentProps } from "./execute/callExecutionAgent.types";
import { initializeExecutor } from "./execute/initializeAgentExecutor";

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
        modelName: creationProps.modelName!,
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

  // const skills: OpenAIToolType = [
  //   ..._skills.map((s) => formatToOpenAIAssistantTool(s)),
  // ];

  const taskAndGoal = {
    task: `${taskObj.name}`,
    inServiceOfGoal: goalPrompt,
  };

  let memories;
  // TODO: better way to check if we should retrieve memories
  if (extractTier(taskObj.id) !== "1") {
    const retrieveMemoriesRunId = v4(); // generate a new UUID for the runId

    const retrievals = [stringifyByMime(returnType, taskAndGoal)];
    void handlePacketCallback({
      type: "handleToolStart",
      input: retrievals.join(", "),
      runId: retrieveMemoriesRunId,
      tool: { lc: 1, type: "not_implemented", id: ["Retrieve Memories"] },
    });
    memories = await retrieveMemoriesSkill.skill.func({
      retrievals,
      namespace,
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

  // humanReadable function
  const humanReadable = (fnName: string) => {
    return fnName
      .replace(/_/g, " ") // replace underscores with spaces
      .replace(/-/g, " ") // replace hyphens with spaces
      .replace(/([a-z])([A-Z])/g, "$1 $2") // insert space between a lowercase and uppercase letter
      .replace(/\b\w/g, (l) => l.toUpperCase()); // convert first letter of each word to uppercase
  };

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    ...taskAndGoal,
    longTermMemories: memories,
    // availableDataSources: [],
    availableTools: skills.map((s) => humanReadable(s.name)),
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
    const readableT = humanReadable(t);
    return skills.filter((s) => humanReadable(s.name) === readableT);
  });

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

      const content = humanMessage?.toString();
      if (!content) {
        throw new Error("No content found for OpenAI Assistant");
      }
      if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
        call = await executor.invoke({
          content,
        });
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
      // re-throw errors that we can't fix
      if (error as Error) {
        // regex matching 'input values have n keys, you must specify an input key or pass only 1 key as input'
        if ((error as Error).message.match(/input values have \d+ keys/)) {
          call = { output: error };
          throw error;
        }
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
        lastToolInput: inputTaskAndGoalString,
        output: finalAnswer.action_input,
        runId: errorFixingRunId,
      });
      call = { output: finalAnswer.action_input };
    }

    const response = call?.output ? (call.output as string) : "";
    // intermediate steps are not available for OpenAI Assistants
    const intermediateSteps =
      (call?.intermediateSteps as AgentStep[] | undefined) ?? [];

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
      lastToolInput: response.slice(0, 100),
      output: bestResponse.slice(0, 100),
      runId: rewriteRunId,
    });

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
    const saveOutput = await saveMemoriesSkill.skill.func({
      memories: [bestResponse],
      namespace: namespace,
    });

    await handlePacketCallback({
      type: "handleToolEnd",
      lastToolInput: bestResponse.slice(0, 100),
      output: saveOutput,
      runId: saveRunId,
    });

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
      agentTools: [],
    });

    try {
      const evaluators = [taskFulfillmentEvaluator];

      const evaluationRunId = v4();
      const minReviewScore = getMinimumScoreFromEnv();
      const shouldEvaluate = minReviewScore !== null;
      shouldEvaluate &&
        void handlePacketCallback({
          type: "handleToolStart",
          input: bestResponse.slice(0, 100),
          runId: evaluationRunId,
          tool: { lc: 1, type: "not_implemented", id: ["Review"] },
        });

      const evaluationResult =
        shouldEvaluate &&
        (await checkTrajectory(
          bestResponse,
          response,
          humanMessage!.toString(),
          intermediateSteps,
          abortSignal,
          tags,
          callbacks,
          evaluators,
        ));

      shouldEvaluate &&
        void handlePacketCallback({
          type: "handleToolEnd",
          lastToolInput: inputTaskAndGoalString,
          output:
            typeof evaluationResult === "string"
              ? evaluationResult
              : "No evaluation result",
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
