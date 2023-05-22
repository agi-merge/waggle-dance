// chain/strategy/plan.ts

import { LLMChain } from "langchain/chains";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export async function executeChain(
  creationProps: ModelCreationProps,
  goal: string,
  task: string,
  dag: string,
) {
  const llm = createModel(creationProps);
  const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createPrompt("execute", creationProps, goal, task, dag);
  const chain = new LLMChain({
    memory,
    prompt,
    llm,
  });
  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
    }),
  ]);
  const _dag = call?.response ? (call.response as string) : "";

  return _dag;
}
