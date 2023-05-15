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
  const memory = await createMemory(goal);
  const planPrompt = createPrompt("plan");
  const prompt = createPrompt("domain", creationProps, goal);
  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      goal,
    }),
  ]);
  const domain = call?.response ? (call.response as string) : "";
  console.log("domainAgent", domain);
  const planChain = new ConversationChain({
    memory,
    prompt: planPrompt,
    llm,
  });
  const [planCall] = await Promise.all([
    planChain.call({
      goal,
      domain,
    }),
  ]);
  const problem = planCall?.response ? (planCall.response as string) : "";
  console.log("problemAgent", problem);

  return { domain, problem };
}
