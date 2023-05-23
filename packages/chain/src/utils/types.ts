// chain/utils/types.ts

import { type OpenAIEmbeddingsParams } from "langchain/embeddings/openai";
import { type BaseLLMParams } from "langchain/llms/base";
import { type OpenAIInput } from "langchain/llms/openai";

const TEXT_EMBEDDING_ADA = "text-embedding-ada-002";
const GPT_35_TURBO = "gpt-3.5-turbo";
const GPT_4 = "gpt-4";
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

// export const packetParser = z.object({
//   type: z.enum(["plan", "execute", "review", "human", "info", "error"]),
//   value: z.string(),
//   message: z.string().optional(),
// });

// export type ChainPacket = z.infer<typeof packetParser>;
// export interface ChainPacket extends BaseChainPacket {

// }
// export interface BaseChainPacket {
//   type: ChainPacketType;
// }

// export type ChainPacketType = { ("plan" | "execute" | "review" | "human" | "info" | "error"): }
// export const ChainPacket = {
//   type: ChainPacketType,

// }
import { type AgentAction } from "langchain/schema";

export type ChainPacket =
  // langchain callbacks
  | { type: "handleLLMNewToken", nodeId: string, token: string }
  | { type: "handleLLMStart", nodeId: string, llm: { name: string } }
  | { type: "handleChainStart", nodeId: string, chain: { name: string } }
  | { type: "handleToolStart", nodeId: string, tool: { name: string } }
  | { type: "handleAgentAction", nodeId: string, action: AgentAction }
  // our callbacks
  | { type: "return", nodeId: string, value: string }
  | { type: "error"; nodeId: string, severity: "warn" | "human" | "fatal", message: string }
  | { type: "scheduled"; nodeId: string };
