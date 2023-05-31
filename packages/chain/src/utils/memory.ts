import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
  type BaseChatMemory,
} from "langchain/memory";
import { RedisChatMessageHistory } from "langchain/stores/message/redis";
import { UpstashRedisChatMessageHistory } from "langchain/stores/message/upstash_redis";

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
        sessionId: hash(goal), //FIXME:
        motorheadURL: process.env.MEMORY_URL ?? "http://localhost:8080",
        inputKey,
      });
      await memory?.init(); // loads previous state from Motörhead 🤘
      return memory;
    case "buffer":
      return new BufferMemory({
        inputKey,
        returnMessages: true
      });
    case "conversation":
      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({ modelName: LLM.fast, temperature: 0 }),
      });
    case "redis":
      return new BufferMemory({
        chatHistory: new RedisChatMessageHistory({
          sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
          sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
          config: {
            url: process.env.MEMORY_URL, // Default value, override with your own instance's URL
          },
        }),
      });
    case "upstash-redis":
      const url = process.env.MEMORY_REST_API_URL ?? "";
      const token = process.env.MEMORY_REST_API_TOKEN ?? "";
      if (url?.length === 0 ?? false) {
        throw new Error("No memory rest api url found")
      }
      if (token?.length === 0 ?? false) {
        throw new Error("No memory rest api key found")
      }
      return new BufferMemory({
        chatHistory: new UpstashRedisChatMessageHistory({
          sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
          sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
          config: {
            url,
            token,
          },
        })
      });
  }
}
