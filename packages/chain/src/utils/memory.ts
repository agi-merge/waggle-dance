import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
  type BaseChatMemory,
} from "langchain/memory";

import { LLM } from "./types";

function hash(str: string): string {
  const hash = sha256(str);
  return hash.toString(Hex);
}

export async function createMemory(
  goal: string,
  inputKey: "goal" | "task" = "goal",
): Promise<BaseChatMemory | undefined> {
  switch (process.env.MEMORY_TYPE) {
    case "motorhead":
      const memory: MotorheadMemory = new MotorheadMemory({
        sessionId: hash(goal),
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
        llm: new OpenAI({ modelName: LLM.smartLarge, temperature: 0 }),
      });
  }
}
