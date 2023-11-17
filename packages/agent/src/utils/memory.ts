import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  CombinedMemory,
  ConversationSummaryMemory,
  VectorStoreRetrieverMemory,
  type BaseMemory,
} from "langchain/memory";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { createSTMNamespace } from "../memory/namespace";
import { LLM, LLM_ALIASES } from "./llms";
import { createEmbeddings } from "./model";
import { vectorStoreFromIndex } from "./vectorStore";

export type MemoryType =
  // | BaseChatMemory
  BaseMemory;
// | BaseMessage[]
// | undefined;
export type MemoryOptions = {
  executionNamespace: string | null;
  taskId: string;
  memoryType?: string | undefined;
  inputKey?: string | undefined;
  memoryKey?: string | undefined;
  returnUnderlying?: boolean | undefined;
};
export async function createMemory({
  executionNamespace,
  taskId,
  memoryType,
  inputKey,
  memoryKey,
  returnUnderlying,
}: MemoryOptions): Promise<MemoryType | undefined> {
  if (inputKey === undefined) {
    inputKey = "input";
  }
  if (memoryKey === undefined) {
    memoryKey = "chat_history";
  }
  if (returnUnderlying === undefined) {
    returnUnderlying = true;
  }
  switch (memoryType) {
    case "dynamic":
      const buffer = createMemory({
        executionNamespace,
        taskId,
        memoryType: "buffer",
        inputKey,
        memoryKey: `${memoryKey}_buffer`,
        returnUnderlying,
      });

      const conversation = createMemory({
        executionNamespace,
        taskId,
        memoryType: "conversation",
        inputKey,
        memoryKey: `${memoryKey}_conversation`,
        returnUnderlying,
      });

      const vector = createMemory({
        executionNamespace,
        taskId,
        memoryType: "vector",
        inputKey,
        memoryKey: `${memoryKey}_vector`,
        returnUnderlying,
      });

      const memories = (
        await Promise.all([buffer, conversation, vector])
      ).flatMap((m) => ((m as BaseMemory) ? (m as BaseMemory) : []));

      const combined = new CombinedMemory({
        memories,
      });

      return combined;
    case "buffer":
      return new BufferMemory({
        inputKey,
        memoryKey,
        returnMessages: returnUnderlying,
      });
    case "vector":
      if (executionNamespace) {
        console.debug("Creating chat history vector store from index");
        const shortTermMemoryNamespace = createSTMNamespace(
          executionNamespace,
          taskId,
        );
        const vectorStore = await vectorStoreFromIndex(
          shortTermMemoryNamespace,
        );

        // extremely important to avoid data leaks/context poisoning.
        const vectorStoreRetriever = vectorStore.asRetriever(15, {
          where: {
            operator: "Equal",
            path: ["namespace"],
            valueText: shortTermMemoryNamespace,
          },
        });

        const vectorMemory = new VectorStoreRetrieverMemory({
          vectorStoreRetriever: vectorStoreRetriever,
          memoryKey,
          inputKey,
          returnDocs: returnUnderlying,
        });

        return vectorMemory;
      } else {
        console.warn("No memory namespace; falling back to MemoryVectorStore");
        const vectorStore = new MemoryVectorStore(
          createEmbeddings({ modelName: LLM.embeddings }),
        );

        return new VectorStoreRetrieverMemory({
          vectorStoreRetriever: vectorStore.asRetriever(15),
        });
      }
    case "conversation":
      return new ConversationSummaryMemory({
        inputKey,
        llm: new OpenAI({
          modelName: LLM_ALIASES["fast-large"],
          temperature: 0,
        }),
        memoryKey,
        returnMessages: returnUnderlying,
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
  if (memoryType !== undefined) {
    throw new Error(`Unknown memory type ${memoryType}`);
  }
}
