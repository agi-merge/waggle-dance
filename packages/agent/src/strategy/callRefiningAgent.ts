// agent/strategy/callRefiningAgent.ts

import { LLMChain } from "langchain/chains";

import { type ModelCreationProps } from "../..";
import { createRefinePrompt } from "../prompts/createRefinePrompt";
import { AgentPromptingMethod } from "../utils/llms";
import { createModel } from "../utils/model";

export async function callRefiningAgent(params: {
  creationProps: ModelCreationProps;
  goal: string;
  signal: AbortSignal;
}) {
  const { goal, signal, creationProps } = params;
  const llm = createModel(creationProps, AgentPromptingMethod.ZeroShotReAct);
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createRefinePrompt({ goal, tools: "", returnType: "JSON" });
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

  const feedback = call?.response
    ? (call.response as string)
    : call?.text
    ? (call.text as string)
    : "error";

  return feedback;
}
