import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  VectorStoreRetrieverMemory,
  type BaseChatMemory,
  type BaseMemory,
} from "langchain/memory";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { createChatNamespace } from "../memory/namespace";
import { LLM, LLM_ALIASES } from "./llms";
import { createEmbeddings } from "./model";
import { vectorStoreFromIndex } from "./vectorStore";

export type MemoryType = BaseChatMemory | BaseMemory | undefined;
export async function createMemory(
  inputKey: "goal" | "task" = "goal",
  namespace: string | null,
  taskId: string,
): Promise<MemoryType> {
  switch (process.env.MEMORY_TYPE) {
    case "buffer":
      return new BufferMemory({
        inputKey,
        returnMessages: true,
      });

    case "vector":
      if (namespace) {
        const vectorStore = await vectorStoreFromIndex(
          createChatNamespace(namespace, taskId),
        );

        const vectorMemory = new VectorStoreRetrieverMemory({
          // 1 is how many documents to return, you might want to return more, eg. 4
          vectorStoreRetriever: vectorStore.asRetriever(1),
          memoryKey: "chat_history",
          inputKey: "input",
        });

        return vectorMemory;
      } else {
        const vectorStore = new MemoryVectorStore(
          createEmbeddings({ modelName: LLM.embeddings }),
        );
        return new VectorStoreRetrieverMemory({
          // 1 is how many documents to return, you might want to return more, eg. 4
          vectorStoreRetriever: vectorStore.asRetriever(5),
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
    // case "redis":
    //   return new BufferMemory({
    //     chatHistory: new RedisChatMessageHistory({
    //       sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
    //       sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
    //       config: {
    //         url: process.env.MEMORY_URL, // Default value, override with your own instance's URL
    //       },
    //     }),
    //   });
    // case "upstash-redis":
    //   const url = process.env.MEMORY_REST_API_URL ?? "";
    //   const token = process.env.MEMORY_REST_API_TOKEN ?? "";
    //   if (url?.length === 0 ?? false) {
    //     throw new Error("No memory rest api url found");
    //   }
    //   if (token?.length === 0 ?? false) {
    //     throw new Error("No memory rest api key found");
    //   }

    //   return new ConversationSummaryMemory({
    //     inputKey,
    //     llm: new OpenAI({
    //       modelName: LLM_ALIASES["fast-large"],
    //       temperature: TEMPERATURE_VALUES.Stable,
    //     }),
    //     chatHistory: new UpstashRedisChatMessageHistory({
    //       sessionId: new Date().toISOString(), // FIXME: Or some other unique identifier for the conversation
    //       sessionTTL: 3600, // 1 hour, omit this parameter to make sessions never expire
    //       config: {
    //         url,
    //         token,
    //       },
    //     }),
    //   });
    // return new BufferMemory({

    // });
  }
}
