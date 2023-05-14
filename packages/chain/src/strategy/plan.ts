import { ConversationChain } from "langchain/chains";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export interface PDDL {
  domain: string;
  types: Record<string, string>;
  predicates: Record<string, string[]>;
  actions: Record<string, Action>;
}

export type Action = {
  parameters: string[];
  precondition: string[];
  effect: string[];
};

export async function planChain(
  creationProps: ModelCreationProps,
  goal: string,
) {
  const llm = createModel(creationProps);
  const memory = await createMemory(goal); // loads previous state from Motörhead 🤘
  const prompt = createPrompt("domain");

  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const [/*otherAgentPrompt, */ call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      goal,
      schema: "",
    }),
  ]);
  const completion = call?.response ? (call.response as string) : "";
  console.log(`planAgent: ${completion}`);
  const pddl = JSON.parse(completion) as PDDL;
  return pddl;
}
