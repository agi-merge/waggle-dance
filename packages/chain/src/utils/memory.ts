import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  type BaseChatMemory,
  type BaseMemory,
  VectorStoreRetrieverMemory,
  EntityMemory,

} from "langchain/memory";

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { type BaseLLM } from "langchain/llms"
import { LLM } from "./types";
import { createEmbeddings } from "./model";


export type Memory = "buffer" | "entity" | "vector" | "conversation";
export function createMemory(
  type: Memory,
  model: BaseLLM
): BaseChatMemory | BaseMemory | undefined {
  switch (type || process.env.MEMORY_TYPE) {
    case "vector":
      const vectorStore = new MemoryVectorStore(createEmbeddings({ modelName: LLM.embeddings }));
      const memory = new VectorStoreRetrieverMemory({
        vectorStoreRetriever: vectorStore.asRetriever(5),
        memoryKey: "chat_history",
      });
      return memory;
    case "entity":
      return new EntityMemory({
        llm: model,
        chatHistoryKey: "chat_history", // Default value
        entitiesKey: "entities", // Default value
      });
    case "buffer":
      return new BufferMemory({
        returnMessages: true
      });
    case "conversation":
      return new ConversationSummaryMemory({
        llm: new OpenAI({ modelName: LLM.fast, temperature: 0 }),
      });
  }
}
