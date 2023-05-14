import { ConversationChain } from "langchain/chains";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { extractTasks } from "../utils/serialization";
import { type ModelCreationProps } from "../utils/types";

export async function planChain(
  creationProps: ModelCreationProps,
  goal: string,
) {
  const llm = createModel(creationProps);
  const memory = await createMemory(goal); // loads previous state from Motörhead 🤘
  const prompt = createPrompt("plan");

  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const [/*otherAgentPrompt, */ call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      goal,
      schema: "Planning Domain Definition Language (PDDL)[]",
    }),
  ]);
  const completion = call?.response ? (call.response as string) : "";
  console.log(`planAgent: ${completion}`);
  const tasks = extractTasks(completion, []);
  return tasks;
}
