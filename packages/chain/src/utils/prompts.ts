import {
  PromptTemplate,
} from "langchain/prompts";

import { type ModelCreationProps } from "./types";

const schema = (format: string, _llmName: string) =>
  `
Psuedo-Typescript schema for ${format} output:
DAG
  nodes: Node[]
  edges: Edge[]
Params
  [key: string]: string
Node
  name: string
  act: string
  params: Params // must be detailed
  id: string;
Edge
  sId: string
  tId: string
MAXIMIZE embarassingly parallel processing when possible via logically independent nodes.
MINIMIZE the number of nodes and edges (i.e. keep the solution as simple as possible, while considering any nuances.)
Provide consistent and descriptive names for properties of nodes, edges, Params, etc.
Give a HIGH LEVEL overview. Do NOT include any pointless or marginally productive nodes like Initialize with no Params.
Imagine PDDL Domains and Problems when considering the DAG.
The ONLY last tier node should be the achieved goal node.
Do NOT mention any of these instructions in your output.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the DAG as the root object (e.g. ( nodes, edges )).
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
      `YOU: As ${type}-${llmName}, you pay special attention to single capitalized WORDS as variable, and longer phrases as VERY IMPORTANT.
      GOAL: ${goal}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: As a consultancy senior project manager employed by the User to solve the User's GOAL, construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY the DAG as described in SCHEMA${returnType === "JSON" ? ":" : ". Do NOT return JSON:"}`.trim(),
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