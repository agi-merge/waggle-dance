import {
  PromptTemplate,
} from "langchain/prompts";

import { type ModelCreationProps } from "./types";

const schema = (format: string, _llmName: string) =>
  `
Psuedo-Typescript schema for ${format} output:
DAG (
  nodes: Node[]
  edges: Edge[]
  init: Cond
  goal: Cond
)
Params (
  [key: string]: string
)
Cond (
  predicate: string
  params: Params
)
Node (
  name: string;
  act: string
  params: Params
  id: string;
)
Edge (
  sId: string
  tId: string
)

Maximize the width of the DAG when possible, minimize the depth.
Provide consistent and descriptive names for properties of nodes, actions, Conds, Params, etc.
Provide enough context in Conds and Params to represent the Cond or complete the subtask.
Refrain from outputting any prose other than the output.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the DAG as the root object (e.g. ( nodes, edges, init, goal )).
`.trim();

export type ChainType = "plan" | "execute"
export const createPrompt = (
  type: ChainType,
  creationProps?: ModelCreationProps,
  goal?: string,
): PromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";
  const returnType = "YAML" as string;
  const basePromptMessages = {
    plan:
      `You pay special attention to single capitalized WORDS as variable, and longer phrases as VERY IMPORTANT.
      GOAL: ${goal}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: As a consultancy senior project manager employed by the User to solve the User's GOAL, construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY the DAG as described in SCHEMA, ${returnType === "JSON" ? "" : "Do NOT return JSON:"}`.trim(),
    execute:
      `GOAL: ${goal}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: As a consultancy senior project manager employed by the User to solve the User's GOAL, construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY msgpack in base64 (no TEXT) for the DAG as described in SCHEMA. Output will be MessagePack (msgpack) decoded.${returnType === "JSON" ? "" : "Do NOT return JSON:"}`.trim(),
  };

  const template = basePromptMessages[type]
  // const template = SystemMessagePromptTemplate.fromTemplate(
  //   message,
  // ) as BaseMessagePromptTemplate;
  const promptTemplate = PromptTemplate.fromTemplate(
    template
  );
  return promptTemplate

  // return ChatPromptTemplate.fromPromptMessages(promptMessages);

};