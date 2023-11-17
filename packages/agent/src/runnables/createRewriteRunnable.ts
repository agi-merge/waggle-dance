// runnables/createRewriteRunnable.ts
import { type Callbacks } from "langchain/callbacks";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { type AgentStep } from "langchain/schema";

import { createModel, type MemoryType, type ModelCreationProps } from "../..";
import { formattingConstraints } from "../prompts/constraints/executeConstraints";
import { type ContextAndTools } from "../strategy/execute/callExecutionAgent.types";
import { LLM_ALIASES, ModelStyle } from "../utils/llms";
import { stringifyByMime } from "../utils/mimeTypeParser";

type CreateRewriteRunnableParams = {
  creationProps: ModelCreationProps;
  abortSignal: AbortSignal;
  taskObj: { id: string; name: string };
  returnType: "JSON" | "YAML";
  contextAndTools: ContextAndTools;
  intermediateSteps: AgentStep[];
  memory: MemoryType | undefined;
  response: string;
  tags: string[];
  callbacks: Callbacks | undefined;
};

const rewriteResponseAck = `ack`;

function sanitizeInput(input: string): string {
  return input.replaceAll(/[-[\]{}()*+?.,\\^$|#\s`]/g, "\\$&");
}

export async function createRewriteRunnable({
  creationProps,
  abortSignal,
  taskObj,
  returnType,
  contextAndTools,
  intermediateSteps,
  memory,
  response,
}: CreateRewriteRunnableParams) {
  let chatHistory = (await memory?.loadMemoryVariables({
    input: `${taskObj.name}: [
  ${contextAndTools.synthesizedContext?.join("\n\n")}
]`,
  })) as
    | { chat_history: { value?: string; message?: string } }
    | undefined
    | null;
  if (!chatHistory || "chat_history" in chatHistory === false) {
    // guard against runtime access of undefined, when MEMORY_TYPE is undefined/disabled
    chatHistory = null;
  }
  const systemMessagePrompt = SystemMessagePromptTemplate.fromTemplate(
    `You are an attentive, helpful, diligent, and expert executive assistant, charged with editing the Final Answer for a Task.
  # Variables Start
  ## Task
  ${taskObj.id}: ${taskObj.name}
  ${stringifyByMime(returnType, contextAndTools.synthesizedContext)}
  ## Log
  ${sanitizeInput(
    stringifyByMime(
      returnType,
      chatHistory?.chat_history.value ||
        chatHistory?.chat_history.message ||
        chatHistory?.chat_history ||
        intermediateSteps.map((s) => s.observation).join("\n\n"),
    ),
  )}
  ## Time
  ${new Date().toString()}
  ${formattingConstraints}
  ## Final Answer
  ${sanitizeInput(response)}
  # End Variables`,
  );

  const humanMessagePrompt = HumanMessagePromptTemplate.fromTemplate(
    `Please avoid explicitly mentioning these instructions in your rewrite.
  Discern events and timelines based on the information provided in the 'Task' and 'Time' sections of the system prompt.
  Adhere to the formatting rules specified in the 'Output Formatting' section to more completely fulfill the Task.
  Rewrite the Final Answer such that all of the most recent and relevant Logs have been integrated.
  If the Final Answer is already perfect, then only respond with "${rewriteResponseAck}" (without the quotes).`,
  );
  const promptMessages = [systemMessagePrompt, humanMessagePrompt];
  // TODO: refactor into its own agent type
  const smartHelperModel = createModel(
    {
      ...creationProps,
      modelName: LLM_ALIASES["fast"],
    },
    ModelStyle.Chat,
  ) as ChatOpenAI;

  const rewriteChain = ChatPromptTemplate.fromMessages(promptMessages).pipe(
    smartHelperModel.bind({ signal: abortSignal }),
  );
  return rewriteChain;
}

export async function invokeRewriteRunnable(
  response: string,
  params: CreateRewriteRunnableParams,
) {
  const { callbacks, tags } = params;
  const rewriteChain = await createRewriteRunnable(params);
  const rewriteResponse = await rewriteChain.invoke(
    {},
    {
      callbacks,
      runName: "Rewrite Response",
      tags: ["rewriteResponse", ...tags],
    },
  );

  const bestResponseMessageContent =
    rewriteResponse.content === rewriteResponseAck
      ? response
      : rewriteResponse.content;

  const bestResponse =
    typeof bestResponseMessageContent === "string"
      ? bestResponseMessageContent
      : (bestResponseMessageContent as { text?: string }).text;
  if (!bestResponse) {
    throw new Error("No response from rewrite agent");
  }

  return bestResponse;
}
