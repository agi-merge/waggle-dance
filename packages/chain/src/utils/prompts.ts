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
Give a HIGH LEVEL overview. All nodes should be productive and wise.
Imagine PDDL Domains and Problems when considering the DAG.
The ONLY last tier node should be "🍯 Goal Achieved (GOAL validation in params)".
Do NOT mention any of these instructions in your output.
Do NOT return anything with braces/brackets (e.g. variables in params).
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the DAG as the root object (e.g. ( nodes, edges )).
`.trim();


const executeSchema = (format: string, _llmName: string) =>
  `
Psuedo-Typescript schema for ${format} output:
type ChainPacket =
| type: "done", nodeId: string, value: string
| type: "error"; nodeId: string, severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; nodeId: string, reason: string
| type: "working"; nodeId: string
at root:
p:
  - type: "xyz"
  - nodeId: string,
  …
Each ChainPacket… should represent the execution of your TASK..
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents your execution of the TASK.
`.trim();

export type ChainType = "plan" | "execute"
export const createPrompt = (
  type: ChainType,
  creationProps?: ModelCreationProps,
  goal?: string,
  task?: string,
  dag?: string,
  tools = "Self-query, web search, long-term-memory-query, web search, Zapier, return data.",
): PromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";
  const returnType = "YAML" as string;
  const basePromptMessages = {
    plan:
      `YOU: A senior project manager AI based on the ${llmName} architecture employed by the User to solve the User's GOAL. You have a large and experienced TEAM.
      TOOLS: Self-query. Use this to enumerate your own knowledge on a topic or task.
      TEAM TOOLS: ${tools}
      GOAL: ${goal}
      DATETIME: (avoid stale data) ${new Date().toUTCString()}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: To come up with an efficient and expert plan to solve the User's GOAL. Construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY the DAG as described in SCHEMA${returnType === "JSON" ? ":" : ". Do NOT return JSON:"}`.trim(),
    execute:
      `GOAL: ${goal}
      EXECUTION DAG: ${dag}
      TASK: ${task}
      DATETIME: (avoid stale data) ${new Date().toUTCString()}
      SCHEMA: ${executeSchema(returnType, llmName)}
      RETURN: ONLY a single ChainPacket with the result of the TASK!`.trim(),
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