// chain/utils/types.ts

import { type OpenAIEmbeddingsParams } from "langchain/embeddings/openai";
import { type BaseLLMParams } from "langchain/llms/base";
import { type OpenAIInput } from "langchain/llms/openai";
import { type Serialized } from "langchain/load/serializable";
import { type AgentAction } from "langchain/schema";

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
    OpenAIKeyProvider,
    OpenAIConfigurationParameters {
  verbose?: boolean;
}

export interface EmbeddingsCreationProps
  extends Partial<OpenAIEmbeddingsParams>,
    OpenAIKeyProvider,
    OpenAIConfigurationParameters {
  verbose?: boolean;
}

export type ChainValues = Record<string, unknown>;

export type ChainPacket =
  // server-side only
  | { type: "handleLLMStart" }
  | { type: "token"; token: string } // handleLLMNewToken (shorted on purpose)
  | { type: "handleLLMEnd"; output: string }
  | { type: "handleLLMError"; err: unknown }
  | { type: "handleChainEnd"; outputs: ChainValues }
  | { type: "handleChainError"; err: unknown }
  | { type: "handleChainStart" }
  | { type: "handleToolEnd"; output: string }
  | { type: "handleToolError"; err: unknown }
  | { type: "handleToolStart"; tool: Serialized; input: string }
  | { type: "handleAgentAction"; action: AgentAction }
  | { type: "handleAgentEnd"; value: string }
  | { type: "handleText"; text: string }
  // our callbacks
  | { type: "done"; value: string }
  | { type: "error"; severity: "warn" | "human" | "fatal"; message: string }
  | { type: "requestHumanInput"; reason: string }
  // client-side only
  | { type: "starting"; nodeId: string }
  | { type: "working"; nodeId: string };
