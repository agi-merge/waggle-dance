// chain/strategy/createPlanningAgent.ts

import { LLMChain } from "langchain/chains";

import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export async function createPlanningAgent(
  creationProps: ModelCreationProps,
  goal: string,
  goalId: string,
  signal: AbortSignal,
) {
  const llm = createModel(creationProps);
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createPrompt("plan", creationProps, goal, goalId);
  const chain = new LLMChain({
    // memory,
    prompt,
    llm,
  });

  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      signal
    }),
  ]);
  const dag = call?.response ? (call.response as string) : "";

  return dag;
}
