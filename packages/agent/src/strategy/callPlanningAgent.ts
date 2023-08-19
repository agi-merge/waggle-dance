// chain/strategy/createPlanningAgent.ts

import { LLMChain } from "langchain/chains";

import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export async function callPlanningAgent(
  creationProps: ModelCreationProps,
  goal: string,
  goalId: string,
  signal: AbortSignal,
) {
  const llm = createModel(creationProps);
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createPrompt({ type: "plan", creationProps, goal, goalId });
  const chain = new LLMChain({
    // memory,
    prompt,
    tags: ["plan", goalId],
    llm,
  });

  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      signal,
      tags: ["plan", goalId],
    }),
  ]);

  const dag = call?.response
    ? (call.response as string)
    : call?.text
    ? (call.text as string)
    : "error";

  return dag;
}
