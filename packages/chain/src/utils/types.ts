import { type CallbackManager } from "langchain/callbacks";
import { type OpenAIEmbeddingsParams } from "langchain/embeddings/openai";
import { type BaseLLMParams } from "langchain/llms/base";
import { type OpenAIInput } from "langchain/llms/openai";
import { z } from "zod";

const TEXT_EMBEDDING_ADA = "text-embedding-ada-002";
const GPT_35_TURBO = "gpt-3.5-turbo";
const _GPT_4 = "gpt-4";
const _GPT_4_32k = "gpt-4-32k";
export enum LLM {
  embeddings = TEXT_EMBEDDING_ADA,
  fast = GPT_35_TURBO,
  smart = GPT_35_TURBO, //GPT_4,
  smartLarge = GPT_35_TURBO, //GPT_4_32k,
}

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
  callbacks?: CallbackManager;
  modelName: LLM;
}

export interface EmbeddingsCreationProps
  extends Partial<OpenAIEmbeddingsParams>,
    OpenAIKeyProvider,
    OpenAIConfigurationParameters {
  verbose?: boolean;
}

export const packetParser = z.object({
  type: z.enum(["plan", "execute", "review", "human", "system"]),
  value: z.string(),
  message: z.string().optional(),
});

export type ChainPacket = z.infer<typeof packetParser>;
