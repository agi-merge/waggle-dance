// agent/strategy/callExecutionAgent.ts
import type { InitializeAgentExecutorOptions } from "langchain/agents";
import {
  AgentExecutor,
  initializeAgentExecutorWithOptions,
} from "langchain/agents";
import type { Callbacks } from "langchain/callbacks";
import type { ChatOpenAI } from "langchain/chat_models/openai";
import type { InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { OpenAIAssistantRunnable } from "langchain/experimental/openai_assistant";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import type { OpenAI } from "langchain/llms/openai";
import type { MessageContent } from "langchain/schema";
import type { StructuredTool, Tool } from "langchain/tools";
import type { OpenAI as OpenAIClient } from "openai";

import type { MemoryType } from "../../..";
import { formatToOpenAIAssistantTool } from "../../..";
import type {
  InitializeAgentExecutorOptionsAgentType,
  InitializeAgentExecutorOptionsStructuredAgentType,
} from "../../utils/llms";
import {
  AgentPromptingMethod,
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM_ALIASES,
} from "../../utils/llms";
import type { ModelCreationProps } from "../../utils/OpenAIPropsBridging";

export type OpenAITool =
  | OpenAIClient.Beta.AssistantCreateParams.AssistantToolsCode
  | OpenAIClient.Beta.AssistantCreateParams.AssistantToolsRetrieval
  | OpenAIClient.Beta.AssistantCreateParams.AssistantToolsFunction;

export type InitializeExecutorReturnType =
  | AgentExecutor
  | PlanAndExecuteAgentExecutor;

export async function initializeExecutor(
  _goalPrompt: string,
  agentPromptingMethod: AgentPromptingMethod,
  _taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: StructuredTool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
  runName: string,
  systemMessage: MessageContent | undefined,
  humanMessage: MessageContent | undefined,
  callbacks: Callbacks | undefined,
  memory: MemoryType | undefined,
): Promise<InitializeExecutorReturnType> {
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
      agentType: agentType!,
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      maxIterations: 15,
      ...creationProps,
      tags,
      handleParsingErrors: true,
    };

    if (
      agentType !== "zero-shot-react-description" &&
      agentType !== "chat-zero-shot-react-description"
    ) {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      tools as Tool[],
      llm,
      options as InitializeAgentExecutorOptions,
    );
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType!,
      returnIntermediateSteps: true,
      earlyStoppingMethod: "generate",
      handleParsingErrors: true,
      maxIterations: 15,
      ...creationProps,
      tags,
    };

    if (agentType !== "structured-chat-zero-shot-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      tools as Tool[],
      llm,
      options as InitializeAgentExecutorOptionsStructured,
    );
  } else if (agentPromptingMethod === AgentPromptingMethod.PlanAndExecute) {
    executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: tools as Tool[],
      tags,
    });
  } else {
    const openAIAssistantTools = [
      ...tools.map(formatToOpenAIAssistantTool),
      { type: "code_interpreter" },
      { type: "retrieval" },
    ] as OpenAITool[];
    //if (agentPromptingMethod === AgentPromptingMethod.OpenAIAssistant) {
    const agent = await OpenAIAssistantRunnable.createAssistant({
      model: LLM_ALIASES["smart-xlarge"],
      instructions: systemMessage!.toString(),
      name: "Execution Agent",
      tools: openAIAssistantTools,
      pollIntervalMs: 250,
      asAgent: true,
    });
    const structuredTools = tools
      .flatMap((t) => t)
      .filter((t) => "description" in t);
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
    });
  }
  return executor;
}
