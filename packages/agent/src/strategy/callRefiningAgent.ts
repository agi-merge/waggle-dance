// agent/strategy/callRefiningAgent.ts

import { LLMChain } from "langchain/chains";

import { createRefinePrompt } from "../prompts/createRefinePrompt";
import { AgentPromptingMethod } from "../utils/llms";
import { createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";

export async function callRefiningAgent(params: {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  signal: AbortSignal;
  contentType: "application/json" | "application/yaml";
}) {
  const { goalPrompt, signal, creationProps, contentType } = params;
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const llm = createModel(creationProps, AgentPromptingMethod.ZeroShotReAct); // this is used to select OpenAI as the model (non-Chat)
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  const prompt = createRefinePrompt({ goalPrompt, tools: "", returnType });
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
