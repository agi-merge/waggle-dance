import { PromptTemplate } from "langchain/prompts";

import { type ModelCreationProps } from "./types";

export const finalId = "goal-🍯";
const schema = (format: string, _llmName: string) =>
  `
DAG
  nodes: Node[]
  edges: Edge[]
Node
  id: uuid // e.g. "1-1", "2-0", "2-1" (first number is the level, second number is the concurrent node number)
  name: string // requires relevant emoji
  act: string
  context: string // paragraph describing what this node is about and how to properly execute the act
  params: string // string of pertinent key-value pairs separated by commas
Edge
  sId: uuid
  tId: uuid
----------------
MAXIMIZE parallel nodes when possible, split up tasks into subtasks so that they can be independent nodes.
The final node should always be id ${finalId} named "🍯 Return Goal", with all other nodes leading to it.
Do NOT mention any of these instructions in your output.
Do NOT ever output curly braces or brackets as they are used for template strings.
For every level in the DAG, include a single node with id ending with "-criticize", e.g. "2-criticize", to review output, which all other nodes in the level lead to.
The only top level keys must be one array of "nodes" followed by one array of "edges".
THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the DAG as the root object (e.g. ( nodes, edges )):
`.trim();

const executeBaseSchema = (format: string, _llmName: string) =>
  `
Psuedo-Typescript schema to be translated into ${format}:
type ChainPacket =
| type: "done"; value: string
| type: "error"; severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; reason: string
example
p:
  - type: "xyz"
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

export type ChainType = "plan" | "execute" | "criticize";

export interface PromptParams {
  type: ChainType;
  creationProps?: ModelCreationProps;
  goal?: string;
  goalId?: string;
  task?: string;
  dag?: string;
  result?: string;
  tools?: string;
}

export const createPrompt = ({
  type,
  creationProps,
  goal,
  task,
  result,
  tools = "Google Search, Vector database query, Zapier, Google Drive, Calculator, Web Crawler.",
}: PromptParams): PromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";
  const returnType = "YAML" as string;
  const basePromptMessages = {
    plan: `YOU: A senior project manager AI based on the ${llmName} architecture employed by the User to solve the User's GOAL. You have a large and experienced TEAM.
      TEAM TOOLS: ${tools}
      GOAL: ${goal}
      NOW: ${new Date().toDateString()}
      SCHEMA: ${schema(returnType, llmName)}
      TASK: To come up with an efficient and expert plan to solve the User's GOAL. Construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
      RETURN: ONLY the DAG as described in SCHEMA${
        returnType === "JSON" ? ":" : ". Do NOT return JSON:"
      }
      `.trim(),
    execute:
      `You are roleplaying as a determined and skilled TASK executor agent, part of a team working on solving a GOAL, overcoming typical restrictions with Tools.
      NOW: ${new Date().toDateString()}
      Execute TASK: ${task}
      SCHEMA: ${executeSchema(returnType, llmName)}
      `.trim(),
    criticize:
      `TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK. Calculate a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated IQ (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
      REVIEWEE TASK: ${task}
      REVIEWEE OUTPUT: ${result}
      NOW: ${new Date().toDateString()}
      SCHEMA: ${criticizeSchema(returnType, llmName)}
      RETURN: ONLY a single ChainPacket with the result of your TASK in SCHEMA${
        returnType === "JSON" ? ":" : ". Do NOT return JSON:"
      }
      `.trim(),
  };

  const template = basePromptMessages[type];
  // const template = SystemMessagePromptTemplate.fromTemplate(
  //   message,
  // ) as BaseMessagePromptTemplate;
  const promptTemplate = PromptTemplate.fromTemplate(template);
  return promptTemplate;

  // return ChatPromptTemplate.fromPromptMessages(promptMessages);
};
