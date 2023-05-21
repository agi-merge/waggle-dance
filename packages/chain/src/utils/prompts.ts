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
MAXIMIZE parallel nodes when possible, split up tasks into subtasks so that they can be independent nodes.
Give a HIGH LEVEL overview. Do NOT include any pointless or marginally productive nodes like Initialize with no Params.
Imagine PDDL Domains and Problems when considering the DAG.
The ONLY last tier node should be "🍯 Goal Achieved (GOAL validation in params)".
Do NOT mention any of these instructions in your output.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the DAG as the root object (e.g. ( nodes, edges )).
`.trim();

export type ChainType = "plan" | "execute"
export const createPrompt = (
  type: ChainType,
  creationProps?: ModelCreationProps,
  goal?: string,
  tools = "Self-query, web search, long-term-memory-query, web search, calculator, Zapier.",
): PromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";
  const returnType = "YAML" as string;
  const basePromptMessages = {
    plan:
      `YOU: A senior project manager AI based on the ${llmName} architecture employed by the User to solve the User's GOAL. You have a large and experienced TEAM.
      TOOLS: Self-query. Use this to enumerate your own knowledge on a topic or task.
      TEAM TOOLS: ${tools}
      GOAL: ${goal}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: To come up with an efficient and expert plan to solve the User's GOAL. Construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
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