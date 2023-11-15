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
import { OpenAIAssistantRunnable } from "langchain/experimental/openai_assistant";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import { type MessageContent } from "langchain/schema";

import { type MemoryType } from "../../..";
import {
  AgentPromptingMethod,
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM_ALIASES,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../../utils/llms";
import { type ModelCreationProps } from "../../utils/OpenAIPropsBridging";

export async function initializeExecutor(
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
  const structuredTools = tools.filter(
    (t) => "description" in t,
  ) as StructuredTool[];
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
      structuredTools as Tool[],
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
      tools: tools as Tool[],
      tags,
    });
  } else {
    //if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
    const agent = await OpenAIAssistantRunnable.createAssistant({
      model: LLM_ALIASES["smart-xlarge"],
      instructions: systemMessage!.toString(),
      name: "Execution Agent",
      tools,
      asAgent: true,
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
