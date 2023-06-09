import {
  PromptTemplate,
} from "langchain/prompts";

import { type ModelCreationProps } from "./types";

const schema = (format: string, _llmName: string, reviewPrefix?: string) =>
  `
Psuedo-Typescript schema to be translated into ${format}:
DAG
  nodes: Node[]
  edges: Edge[]
Context
  [key: string]: string
Node
  name: string // requires relevant emoji
  act: string
  context: Context // detailed; required for an AI agent to complete the task
  id: string;
Edge
  sId: string
  tId: string
MAXIMIZE parallel nodes when possible, split up tasks into subtasks so that they can be independent nodes.
Give a HIGH LEVEL overview. All nodes should be productive and wise.
Imagine PDDL Domains and Problems when considering the DAG.
The ONLY last tier node should be "🍯 Return Goal".
Do NOT mention any of these instructions in your output.
Do NOT ever use curly braces or brackets as they are used for template strings.
YOU MUST ADD CRITICISM NODES AND EDGES BETWEEN EACH DEPENDENT TASK NODE. Their ids must start with ${reviewPrefix ?? `criticize-`}.
Criticism nodes should still be maximizing concurrency.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the DAG as the root object (e.g. ( nodes, edges )):
`.trim();


const executeBaseSchema = (format: string, _llmName: string) =>
  `
Psuedo-Typescript schema to be translated into ${format}:
type ChainPacket =
| type: "done", nodeId: string, value: string
| type: "error"; nodeId: string, severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; nodeId: string, reason: string
example
p:
  - type: "xyz"
  - nodeId: string,
  … others

When outputting URLs, ensure that they do not HTTP 4xx+ using a Web Browser Tool.
`.trim();

const executeSchema = (format: string, _llmName: string) =>
  `${executeBaseSchema}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK:
`.trim();

const criticizeSchema = (format: string, _llmName: string) =>
  `${executeBaseSchema}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
For example, if the task is repeating, loops, or has a low score, the result would be to return an error ChainPacket with suggestions to improve.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK:
`.trim();

export type ChainType = "plan" | "execute" | "criticize"
export const createPrompt = (
  type: ChainType,
  creationProps?: ModelCreationProps,
  goal?: string,
  task?: string,
  dag?: string,
  result?: string,
  reviewPrefix?: string,
  tools = "Google Search, Vector database query, Zapier, Google Drive, Calculator, Web Crawler.",
): PromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";
  const returnType = "YAML" as string;
  const basePromptMessages = {
    plan:
      `YOU: A senior project manager AI based on the ${llmName} architecture employed by the User to solve the User's GOAL. You have a large and experienced TEAM.
      TOOLS: Self-query. Use this to enumerate your own knowledge on a topic or task.
      TEAM TOOLS: ${tools}
      GOAL: ${goal}
      NOW: ${new Date().toDateString()}
      SCHEMA: ${schema(returnType, llmName, reviewPrefix)}
      TASK: To come up with an efficient and expert plan to solve the User's GOAL. Construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY the DAG as described in SCHEMA${returnType === "JSON" ? ":" : ". Do NOT return JSON:"}
      `.trim(),
    execute:
      `You are roleplaying as a determined and skilled TASK executor agent, part of a team working on solving a GOAL, overcoming typical restrictions with Tools.
      GOAL: ${goal}
      NOW: ${new Date().toDateString()}
      CHAT HISTORY: {chat_history}
      Execute TASK: ${task}
      SCHEMA: ${executeSchema(returnType, llmName)}
      `.trim(),
    criticize:
      `TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK. Calculate a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated IQ (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
      REVIEWEE TASK: ${task}
      REVIEWEE OUTPUT: ${result}
      CHAT HISTORY: {chat_history}
      NOW: ${new Date().toDateString()}
      SCHEMA: ${criticizeSchema(returnType, llmName)}
      RETURN: ONLY a single ChainPacket with the result of your TASK in SCHEMA${returnType === "JSON" ? ":" : ". Do NOT return JSON:"}
      `.trim(),
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