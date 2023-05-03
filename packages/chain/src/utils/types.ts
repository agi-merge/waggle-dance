import { type CallbackManager } from "langchain/callbacks";
import { z } from "zod";

const GPT_35_TURBO = "gpt-3.5-turbo";
const GPT_4 = "gpt-4";
export enum LLM {
  gpt3_5_turbo = GPT_35_TURBO,
  gpt4 = GPT_4,
}

export type ModelCreationProps = {
  // customApiKey: string;
  // customModelName: string;
  // customTemperature: number;
  // customMaxLoops: number;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  callbacks?: CallbackManager;
  verbose?: boolean;
};

export const packetParser = z.object({
  type: z.enum([
    "goal",
    "plan",
    "task",
    "execute",
    "result",
    "system",
    "review",
  ]),
  value: z.string(),
  message: z.string().optional(),
});

export type ChainPacket = z.infer<typeof packetParser>;
