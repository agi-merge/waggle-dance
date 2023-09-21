import { PineconeClient } from "@pinecone-database/pinecone";
import Hex from "crypto-js/enc-hex";
import sha256 from "crypto-js/sha256";
import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
  VectorStoreRetrieverMemory,
  type BaseChatMemory,
  type BaseMemory,
} from "langchain/memory";
import { RedisChatMessageHistory } from "langchain/stores/message/redis";
import { UpstashRedisChatMessageHistory } from "langchain/stores/message/upstash_redis";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import { LLM, LLM_ALIASES, TEMPERATURE_VALUES } from "./llms";
import { createEmbeddings } from "./model";

function hash(str: string): string {
  const hash = sha256(str);
  return hash.toString(Hex);
}

export async function createMemory(
  goal: string,
  inputKey: "goal" | "task" = "goal",
  namespace?: string,
): Promise<BaseChatMemory | BaseMemory | undefined> {
  switch (process.env.MEMORY_TYPE) {
    case "motorhead":
      const memory: MotorheadMemory = new MotorheadMemory({
        sessionId: hash(goal), //FIXME:
        url: process.env.MEMORY_URL ?? "http://localhost:8080",
        inputKey,
      });
      await memory?.init(); // loads previous state from Motörhead 🤘
      return memory;

    case "buffer":
      return new BufferMemory({
        inputKey,
        returnMessages: true,
      });

    case "vector":
      if (namespace) {
        const vectorStore = await createVectorStore(namespace);

        const vectorMemory = new VectorStoreRetrieverMemory({
          // 1 is how many documents to return, you might want to return more, eg. 4
          vectorStoreRetriever: vectorStore.asRetriever(4),
          memoryKey: "chat_history",
        });

        return vectorMemory;
      } else {
        const vectorStore = new MemoryVectorStore(
          createEmbeddings({ modelName: LLM.embeddings }),
        );
        return new VectorStoreRetrieverMemory({
          // 1 is how many documents to return, you might want to return more, eg. 4
          vectorStoreRetriever: vectorStore.asRetriever(4),
          memoryKey: "chat_history",
          inputKey,
        });
      }
    case "conversation":
      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({
          modelName: LLM_ALIASES["fast-large"],
          temperature: 0,
        }),
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
        throw new Error("No memory rest api url found");
      }
      if (token?.length === 0 ?? false) {
        throw new Error("No memory rest api key found");
      }

      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({
          modelName: LLM_ALIASES["fast-large"],
          temperature: TEMPERATURE_VALUES.Stable,
        }),
        chatHistory: new UpstashRedisChatMessageHistory({
          sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
          sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
          config: {
            url,
            token,
          },
        }),
      });
    // return new BufferMemory({

    // });
  }
}

export async function createVectorIndex() {
  if (process.env.PINECONE_API_KEY === undefined)
    throw new Error("No pinecone api key found");
  if (process.env.PINECONE_ENVIRONMENT === undefined)
    throw new Error("No pinecone environment found");
  if (process.env.PINECONE_INDEX === undefined)
    throw new Error("No pinecone index found");
  const client = new PineconeClient();
  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

  return pineconeIndex;
}

export async function createVectorStore(namespace: string) {
  const pineconeIndex = await createVectorIndex();
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace,
  });
  return vectorStore;
}
