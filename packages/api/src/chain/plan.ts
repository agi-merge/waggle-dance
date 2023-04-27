import { ConversationChain } from "langchain/chains";

import { createModel } from "~/utils/llm";
import { extractTasks } from "../../utils/helpers";
import { createPrompt } from "../../utils/prompts";
import type { ModelSettings } from "../../utils/types";
import { createMemory } from "./memory";

export async function planChain(modelSettings: ModelSettings, goal: string) {
  const llm = createModel(modelSettings);
  const memory = await createMemory(goal); // loads previous state from Motörhead 🤘
  const prompt = createPrompt("plan");

  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const [/*otherAgentPrompt, */ call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({ goal, schema: "string[]" }),
  ]);
  const completion = call?.response ? (call.response as string) : "";
  console.log(`planAgent: ${completion}`);
  const tasks = extractTasks(completion, []);
  return tasks;
}
