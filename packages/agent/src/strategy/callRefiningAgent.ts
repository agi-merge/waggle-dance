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
  contentType: "application/json" | "application/yaml";
}) {
  const { goal, signal, creationProps, contentType } = params;
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const llm = createModel(creationProps, AgentPromptingMethod.ZeroShotReAct); // this is used to select OpenAI as the model (non-Chat)
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createRefinePrompt({ goal, tools: "", returnType });
  const chain = new LLMChain({
    // memory,
    prompt,
    tags: ["refine", contentType],
    llm,
  });

  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    chain.call({
      signal,
      tags: ["refine", contentType],
    }),
  ]);

  const feedback = call?.response
    ? (call.response as string)
    : call?.text
    ? (call.text as string)
    : "error";

  console.debug("refining feedback", feedback);

  return feedback;
}
