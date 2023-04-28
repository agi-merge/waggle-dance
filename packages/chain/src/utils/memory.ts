import * as CryptoJS from "crypto-js";
import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
  type BaseChatMemory,
} from "langchain/memory";

import { LLM } from "~/utils/constants";

function sha256(str: string): string {
  const hash = CryptoJS.SHA256(str);
  return hash.toString(CryptoJS.enc.Hex);
}

export async function createMemory(
  goal: string,
  inputKey: "goal" | "task" = "goal",
): Promise<BaseChatMemory> {
  switch (process.env.MEMORY_TYPE) {
    case "motorhead":
      const memory: MotorheadMemory = new MotorheadMemory({
        sessionId: await sha256(goal),
        motorheadURL: process.env.MEMORY_URL ?? "http://localhost:8080",
        inputKey,
      });
      await memory?.init(); // loads previous state from Motörhead 🤘
      return memory;
    case "buffer":
      return new BufferMemory({
        inputKey,
      });
    case "conversation":
      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({ modelName: LLM.gpt3_5_turbo, temperature: 0 }),
      });
  }
}
