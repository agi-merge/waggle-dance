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
  const prompt = createPrompt("domain");
  const planPrompt = createPrompt("plan");

  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const [/*otherAgentPrompt, */ call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      goal,
    }),
  ]);
  const domain = call?.response ? (call.response as string) : "";
  console.log("domainAgent", domain);
  // const parser = new PddlParser(completion);
  // const domain = parser.parse();

  const planChain = new ConversationChain({
    memory,
    prompt: planPrompt,
    llm,
  });
  const [/*otherAgentPrompt, */ planCall] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    planChain.call({
      goal,
      domain,
    }),
  ]);
  const problem = planCall?.response ? (planCall.response as string) : "";
  console.log("problemAgent", problem);

  return { domain, problem };
}
