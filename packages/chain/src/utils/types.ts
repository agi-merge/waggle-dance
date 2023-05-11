import { CallbackManager } from "langchain/callbacks";
import { BaseLLMParams } from "langchain/llms/base";
import { OpenAIInput } from "langchain/llms/openai";
import { z } from "zod";

const GPT_35_TURBO = "gpt-3.5-turbo";
const GPT_4 = "gpt-4";
const GPT_4_32k = "gpt-4-32k";
export enum LLM {
  fast = GPT_35_TURBO,
  smart = GPT_35_TURBO, //GPT_4,
  smartLarge = GPT_35_TURBO, //GPT_4_32k,
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

export const packetParser = z.object({
  type: z.enum(["plan", "execute", "review", "human"]),
  value: z.string(),
  message: z.string().optional(),
});

export type ChainPacket = z.infer<typeof packetParser>;
