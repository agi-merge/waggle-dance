// chain/utils/types.ts

import { type OpenAIEmbeddingsParams } from "langchain/embeddings/openai";
import { type BaseLLMParams } from "langchain/llms/base";
import { type OpenAIInput } from "langchain/llms/openai";

const TEXT_EMBEDDING_ADA = "text-embedding-ada-002";
const GPT_35_TURBO = "gpt-3.5-turbo";
const GPT_4 = "gpt-4-0314";
// const _GPT_4_32k = "gpt-4-32k";
export enum LLM {
  embeddings = TEXT_EMBEDDING_ADA,
  fast = GPT_35_TURBO,
  smart = GPT_4,
}

// Currently, this uses 256 arbitrarily for embeddings, and 50/50 for prompt/response with OpenAI LLMs.
export const llmResponseTokenLimit = (llm: string) => {
  switch (llm) {
    case TEXT_EMBEDDING_ADA:
      return 256;
    case GPT_35_TURBO:
      return 2048;
    case GPT_4:
      return 4096;
  }
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

export type ChainPacket =
  // our callbacks
  | { type: "done", nodeId: string, value: string }
  | { type: "error"; nodeId: string, severity: "warn" | "human" | "fatal", message: string }
  | { type: "requestHumanInput"; nodeId: string, reason: string }
  // client-side only
  | { type: "starting"; nodeId: string }
  | { type: "working"; nodeId: string };
