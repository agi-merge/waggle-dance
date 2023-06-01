import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
  type BaseChatMemory,
  type BaseMemory,
} from "langchain/memory";
import { RedisChatMessageHistory } from "langchain/stores/message/redis";
import { UpstashRedisChatMessageHistory } from "langchain/stores/message/upstash_redis";
import { TimeWeightedVectorStoreRetriever } from "langchain/retrievers/time_weighted";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { LLM } from "./types";
import { createEmbeddings } from "./model";
import { VectorStoreRetrieverMemory } from "langchain/memory";

function hash(str: string): string {
  const hash = sha256(str);
  return hash.toString(Hex);
}

export async function createMemory(
  goal: string,
  inputKey: "goal" | "task" = "goal",
): Promise<BaseChatMemory | BaseMemory | undefined> {
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

    case "vector":
      const vectorStore = new MemoryVectorStore(createEmbeddings({ modelName: LLM.embeddings }));

      // const retriever = new TimeWeightedVectorStoreRetriever({
      //   vectorStore,
      //   memoryStream: [],
      //   searchKwargs: 2,
      // });

      // const vectorMemory = VectorStoreRetrieverMemory({
      //   // 1 is how many documents to return, you might want to return more, eg. 4
      //   vectorStoreRetriever: vectorStore.asRetriever(4),
      // });
      const vectorMemory = new VectorStoreRetrieverMemory({
        // 1 is how many documents to return, you might want to return more, eg. 4
        vectorStoreRetriever: vectorStore.asRetriever(4),
        memoryKey: "chat_history",
        inputKey,
      });

      return vectorMemory;
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

      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({ modelName: LLM.fast, temperature: 0 }),
        chatHistory: new UpstashRedisChatMessageHistory({
          sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
          sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
          config: {
            url,
            token,
          },
        })
      });
    // return new BufferMemory({

    // });
  }
}
