// agent/strategy/callPlanningAgent.ts

import {
  ConstitutionalChain,
  ConstitutionalPrinciple,
  LLMChain,
} from "langchain/chains";
import { stringify } from "yaml";

import { createPlanPrompt, schema } from "../prompts/createPlanPrompt";
import { AgentPromptingMethod, LLM, LLM_ALIASES } from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

export async function callPlanningAgent(
  creationProps: ModelCreationProps,
  goal: string,
  goalId: string,
  signal: AbortSignal,
  namespace: string,
) {
  const returnType = "YAML";
  const tags = [
    "plan",
    goalId,
    ...(creationProps.modelName ? [creationProps.modelName] : []),
  ];
  const llm = createModel(
    creationProps,
    AgentPromptingMethod.ChatConversationalReAct,
  ); // this is used to select a chat model (required for system message prompt)
  // const memory = await createMemory(goal);
  // const planPrompt = createPrompt("plan");
  // const prompt = createPrompt({ type: "plan", creationProps, goal, goalId });
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const skills = await createSkills(
    namespace,
    llm,
    embeddings,
    tags,
    creationProps.callbacks,
  );
  const prompt = createPlanPrompt({
    goal,
    goalId,
    returnType,
    tools: stringify(skills),
  });
  const createPlanchain = new LLMChain({
    // memory,
    prompt,
    tags,
    llm,
  });

  const principle = new ConstitutionalPrinciple({
    name: "Format According To Schema",
    critiqueRequest: `Rewrite the response such that it exactly matches and only contains the schema, as well as validates as ${returnType}.`,
    revisionRequest: schema(returnType),
  });

  const formattingLLM = createModel(
    { ...creationProps, modelName: LLM_ALIASES["fast-large"], maxTokens: -1 },
    AgentPromptingMethod.OpenAIStructuredChat,
  ); // this is used to select a chat model (required for system message prompt)]

  const formattingChain = ConstitutionalChain.fromLLM(formattingLLM, {
    chain: createPlanchain,
    constitutionalPrinciples: [principle],
  });

  const [call] = await Promise.all([
    // prompt.format({ goal, schema: "string[]" }),
    formattingChain.call({
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
