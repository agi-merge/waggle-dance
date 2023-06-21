// chain/utils/types.ts

import { type OpenAIEmbeddingsParams } from "langchain/embeddings/openai";
import { type BaseLLMParams } from "langchain/llms/base";
import { type OpenAIInput } from "langchain/llms/openai";
import { type AgentAction } from "langchain/schema";
import { type Serialized } from "langchain/load/serializable";

const TEXT_EMBEDDING_ADA = "text-embedding-ada-002";
const GPT_35_TURBO = "gpt-3.5-turbo-0613";
const GPT_4 = "gpt-4-0613";
// const _GPT_4_32k = "gpt-4-32k";
export enum LLM {
  embeddings = TEXT_EMBEDDING_ADA,
  fast = GPT_35_TURBO,
  smart = GPT_4,
}

// Currently, this uses 256 arbitrarily for embeddings, and 50/50 for prompt/response with OpenAI LLMs.
export const llmResponseTokenLimit = (_llm: string) => {
  // switch (llm) {
  //   case TEXT_EMBEDDING_ADA:
  //     return 256;
  // case GPT_35_TURBO:
  //   return 2048;
  // case GPT_4:
  //   return 4096;
  // }
  return -1; // uses max remaining token according to model on OpenAI's backend.
};

export const llmKnowledgeCutoff = (llm: string) => {
  switch (llm) {
    case TEXT_EMBEDDING_ADA:
      return "N/A";
    case GPT_35_TURBO:
      return "Sept. 2021";
    case GPT_4:
      return "Sept. 2021";
  }
};

interface OpenAIConfigurationParameters {
  apiKey?:
  | string
  | Promise<string>
  | ((name: string) => string)
  | ((name: string) => Promise<string>);
  organization?: string;
  username?: string;
  password?: string;
  accessToken?:
  | string
  | Promise<string>
  | ((name?: string, scopes?: string[]) => string)
  | ((name?: string, scopes?: string[]) => Promise<string>);
  basePath?: string;
  baseOptions?: unknown;
  formDataCtor?: new () => unknown;
}

type OpenAIKeyProvider = {
  openAIApiKey?: string;
};
export interface ModelCreationProps
  extends Partial<OpenAIInput>,
  BaseLLMParams,
  OpenAIKeyProvider {
  verbose?: boolean;
  modelName: LLM;
}

export interface EmbeddingsCreationProps
  extends Partial<OpenAIEmbeddingsParams>,
  OpenAIKeyProvider,
  OpenAIConfigurationParameters {
  verbose?: boolean;
}

export type RawChainPacket = {
  p: ChainPacket;
}

export type ChainValues = Record<string, unknown>;

export type ChainPacket =
  // server-side only
  | { type: "handleLLMStart" }
  | { type: "token", token: string } // handleLLMNewToken (shorted on purpose)
  | { type: "handleLLMEnd", output: string }
  | { type: "handleLLMError", err: unknown, }
  | { type: "handleChainEnd", outputs: ChainValues, }
  | { type: "handleChainError", err: unknown, }
  | { type: "handleChainStart" }
  | { type: "handleToolEnd", output: string, }
  | { type: "handleToolError", err: unknown, }
  | { type: "handleToolStart", tool: Serialized, input: string, }
  | { type: "handleAgentAction", action: AgentAction, }
  | { type: "handleAgentEnd", value: string }
  | { type: "handleText", text: string, }
  // our callbacks
  | { type: "done", value: string }
  | { type: "error"; severity: "warn" | "human" | "fatal", message: string }
  | { type: "requestHumanInput"; reason: string }
  // client-side only
  | { type: "starting"; nodeId: string }
  | { type: "working"; nodeId: string };
