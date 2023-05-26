// chain/strategy/plan.ts

import { LLMChain } from "langchain/chains";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export async function planChain(
  creationProps: ModelCreationProps,
  goal: string,
) {
  const llm = createModel(creationProps);
  const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createPrompt("plan", creationProps, goal);
  const chain = new LLMChain({
    memory,
    prompt,
    llm,
  });

  const controller = new AbortController();
  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      signal: controller.signal
    },),
  ]);
  const dag = call?.response ? (call.response as string) : "";

  return dag;
}
