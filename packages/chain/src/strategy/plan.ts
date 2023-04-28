import { ConversationChain } from "langchain/chains";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { extractTasks } from "../utils/serialization";
import { ModelCreationProps } from "../utils/types";

export async function planChain(
  modelSettings: ModelCreationProps,
  goal: string,
) {
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
