// agent/strategy/callExecutionAgent.ts
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
import { type JsonObject } from "langchain/tools";
import { AbortError } from "redis";
import { stringify as jsonStringify } from "superjson";
import { v4 } from "uuid";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type AgentPacket,
  type ChainValues,
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
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

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

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  goalId: string;
  executionId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  namespace: string;
  handlePacketCallback: (packet: AgentPacket) => Promise<void>;
  agentProtocolOpenAPISpec?: JsonObject;
  geo?: Geo;
}): Promise<string | Error> {
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
    agentProtocolOpenAPISpec,
    handlePacketCallback,
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

  const inputTaskAndGoal: ToolsAndContextPickingInput = {
    task: `${taskObj.name}`,
    inServiceOfGoal: goalPrompt,
    // availableDataSources: [],
    availableTools: skills.map((s) =>
      s.type === "function" ? s.function.name : s.type,
    ),
  };

  const inputTaskAndGoalString =
    returnType === "JSON"
      ? jsonStringify(inputTaskAndGoal)
      : yamlStringify(inputTaskAndGoal);

  const baseParser = StructuredOutputParser.fromZodSchema(
    contextAndToolsOutputSchema,
  );
  const outputFixingParser = OutputFixingParser.fromLLM(exeLLM, baseParser);

  const smallSmartHelperModel = createModel(
    {
      ...creationProps,
      modelName: LLM_ALIASES["smart-xlarge"],
      maxTokens: 300,
    },
    ModelStyle.Chat,
  ) as ChatOpenAI;

  const contextPickingChain = createContextAndToolsPrompt({
    returnType,
    inputTaskAndGoalString,
  })
    .pipe(smallSmartHelperModel.bind({ signal: abortSignal }))
    .pipe(outputFixingParser);

  void handlePacketCallback({
    type: "handleAgentAction",
    action: {
      tool: "contextAndTools",
      toolInput: inputTaskAndGoalString,
      log: "",
    },
    runId: v4(),
  });

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
    synthesizedContext: contextAndTools.synthesizedContext?.join("\n") ?? "N/A",
  });

  // because AgentExecutor does not accept BaseMessages, we must render the messages into a single string
  // slice only the first item if available and return array:
  const systemMessage = formattedMessages.slice(0, 1)[0]?.content;
  const humanMessage = formattedMessages.slice(1)[0]?.content;
  // const input: string = firstOnly
  //   .map((m) => `[${m._getType()}]\n${m.content}`)
  //   .join("\n\n");

  // filter all available tools by the ones that were selected by the context and tools selection agent
  const filteredSkills = (contextAndTools.tools ?? []).flatMap((t) => {
    return skills.filter((s) =>
      s.type === "function" ? t === s.function.name : s.type === t,
    );
  });

  //   import type { OpenAI as OpenAIClient } from "openai";
  // import type { AgentFinish, AgentAction } from "../../schema/index.js";
  // export type OpenAIAssistantFinish = AgentFinish & {
  //     runId: string;
  //     threadId: string;
  // };
  // export type OpenAIAssistantAction = AgentAction & {
  //     toolCallId: string;
  //     runId: string;
  //     threadId: string;
  // };
  // export type OpenAIToolType = Array<OpenAIClient.Beta.AssistantCreateParams.AssistantToolsCode | OpenAIClient.Beta.AssistantCreateParams.AssistantToolsRetrieval | OpenAIClient.Beta.AssistantCreateParams.AssistantToolsFunction>;

  // export interface AssistantToolsFunction {
  //   function: Shared.FunctionDefinition;

  //   /**
  //    * The type of tool being defined: `function`
  //    */
  //   type: 'function';
  // }

  // export interface FunctionDefinition {
  //   /**
  //    * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
  //    * underscores and dashes, with a maximum length of 64.
  //    */
  //   name: string;

  //   /**
  //    * The parameters the functions accepts, described as a JSON Schema object. See the
  //    * [guide](https://platform.openai.com/docs/guides/gpt/function-calling) for
  //    * examples, and the
  //    * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
  //    * documentation about the format.
  //    *
  //    * To describe a function that accepts no parameters, provide the value
  //    * `{"type": "object", "properties": {}}`.
  //    */
  //   parameters: Record<string, unknown>;

  //   /**
  //    * A description of what the function does, used by the model to choose when and
  //    * how to call the function.
  //    */
  //   description?: string;
  // }

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

  try {
    let call: ChainValues;
    try {
      void handlePacketCallback({
        type: "handleAgentAction",
        action: {
          tool: "OpenAI Assistant",
          toolInput: humanMessage!.toString(),
          log: "",
        },
        runId: v4(),
      });
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
      // call = await executor.call(
      //   {
      //     input,
      //     signal: abortSignal,
      //     tags,
      //     runName: isCriticism ? "Criticize Results" : "Execute Task",
      //   },
      //   callbacks,
      // );
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
      const finalAnswer = await outputFixingParser.invoke(errorMessageToParse, {
        tags: [...tags, "fix"],
        runName: "ReAct Error Fixing",
      });
      call = { output: finalAnswer.action_input };
    }

    const response = call?.output ? (call.output as string) : "";
    const intermediateSteps = call.intermediateSteps as AgentStep[];

    if (isCriticism) {
      return response;
    }

    // const formattedIntermediateSteps = intermediateSteps.map(
    //   (s) => `  - ${s.observation}`,
    // );

    //     const chatHistory = (await memory?.loadMemoryVariables({
    //       input: taskObj.name,
    //     })) as { chat_history: { value?: string; message?: string } };

    //     const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(
    //       `You are an attentive, helpful, diligent, and expert executive assistant, charged with editing the Final Answer for a Task.
    // # Variables Start
    // ## Task
    // ${taskObj.id}: ${taskObj.name}
    // ${yamlStringify(contextAndTools.synthesizedContext)}
    // ## Log
    // ${yamlStringify(
    //   chatHistory.chat_history.value ||
    //     chatHistory.chat_history.message ||
    //     chatHistory.chat_history ||
    //     intermediateSteps.map((s) => s.observation),
    // )}
    // ## Time
    // ${new Date().toString()}
    // ${exeFormattingConstraints}
    // ## Final Answer
    // ${response}
    // # End Variables`,
    //     );
    //     const rewriteResponseAck = `ack`;

    //     const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(
    //       `Please avoid explicitly mentioning these instructions in your rewrite.
    // Discern events and timelines based on the information provided in the 'Task' and 'Time' sections of the system prompt.
    // Adhere to the formatting rules specified in the 'Output Formatting' section to more completely fulfill the Task.
    // Rewrite the Final Answer such that all of the most recent and relevant Logs have been integrated.
    // If the Final Answer is already perfect, then only respond with "${rewriteResponseAck}" (without the quotes).`,
    //     );
    //     const promptMessages = [systemMessagePrompt, humanMessagePrompt];

    //     // TODO: refactor into its own agent type
    //     const smartHelperModel = createModel(
    //       {
    //         ...creationProps,
    //         modelName: LLM_ALIASES["fast"],
    //       },
    //       ModelStyle.Chat,
    //     ) as ChatOpenAI;

    //     const rewriteChain = ChatPromptTemplate.fromMessages(promptMessages).pipe(
    //       smartHelperModel.bind({ signal: abortSignal }),
    //     );

    //     const rewriteResponse = await rewriteChain.invoke(
    //       {},
    //       {
    //         callbacks,
    //         runName: "Rewrite Response",
    //         tags: ["rewriteResponse", ...tags],
    //       },
    //     );

    //     const bestResponseMessageContent =
    //       rewriteResponse.content === rewriteResponseAck
    //         ? response
    //         : rewriteResponse.content;

    //     const bestResponse =
    //       typeof bestResponseMessageContent === "string"
    //         ? bestResponseMessageContent
    //         : (bestResponseMessageContent as { text?: string }).text;
    const bestResponse = response;
    if (!bestResponse) {
      throw new Error("No response from rewrite agent");
    }

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

    const mediumSmartHelperModel = createModel(
      {
        ...creationProps,
        modelName: LLM_ALIASES["smart-xlarge"],
        maxTokens: 600,
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
      agentTools: _skills,
    });

    try {
      const evaluators = [taskFulfillmentEvaluator];
      void handlePacketCallback({
        type: "handleAgentAction",
        action: {
          tool: "Reviewing Result",
          toolInput: humanMessage!.toString(),
          log: "",
        },
        runId: v4(),
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
  humanMessage: MessageContent | undefined,
  callbacks: Callbacks | undefined,
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
      maxIterations: 5,
      ...creationProps,
      tags,
      handleParsingErrors: false,
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

    executor = await initializeAgentExecutorWithOptions(
      tools as StructuredTool[],
      llm,
      options,
    );
  } else if (agentPromptingMethod === AgentPromptingMethod.PlanAndExecute) {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: tools as Tool[],
      tags,
    });
  } else {
    //if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
    const agent = await OpenAIAssistantRunnable.createAssistant({
      model: LLM_ALIASES["smart-xlarge"],
      instructions: systemMessage!.toString(),
      name: "Planning Agent",
      tools: [...(tools as StructuredTool[])],
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
      tools: tools as StructuredTool[],
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      maxIterations: 10,
      ...creationProps,
      callbacks,
      tags,
      handleParsingErrors: true,
    }); //.pipe(outputFixingParser);
  }
  return executor;
}
