// agent/strategy/callRefiningAgent.ts

import { LLMChain } from "langchain/chains";

import { type ModelCreationProps } from "../..";
import { createRefinePrompt } from "../prompts/createRefinePrompt";
import { createModel } from "../utils/model";

export async function callRefiningAgent(params: {
  creationProps: ModelCreationProps;
  goal: string;
  signal: AbortSignal;
}) {
  const { creationProps, goal, signal } = params;
  const llm = createModel(creationProps);
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createRefinePrompt({ goal, tools: "", returnType: "YAML" });
  const chain = new LLMChain({
    // memory,
    prompt,
    tags: ["refine"],
    llm,
  });

  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      signal,
      tags: ["refine"],
    }),
  ]);

  const dag = call?.response
    ? (call.response as string)
    : call?.text
    ? (call.text as string)
    : "error";

  return dag;
}
