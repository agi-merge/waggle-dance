import { OpenAI } from "langchain/llms/openai";
import {
  BufferMemory,
  ConversationSummaryMemory,
  type BaseChatMemory,
} from "langchain/memory";

import {
  EntityMemory,
} from "langchain/memory";
import { type BaseLLM } from "langchain/llms"
import { LLM } from "./types";


export type Memory = "buffer" | "entity" | "vector"
export function createMemory(
  type: "entity" | "conversation" | "buffer",
  model: BaseLLM
): BaseChatMemory | undefined {
  switch (type || process.env.MEMORY_TYPE) {
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
