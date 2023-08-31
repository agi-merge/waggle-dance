import { PromptTemplate } from "langchain/prompts";

import { criticismSuffix } from "./types";

const schema = (format: string) =>
  `
DAG
  nodes: Node[]
  edges: Edge[]
Node
  id: uuid // e.g. "1-1", "2-0", "2-1" (first number is the level, second number is the concurrent node number)
  name: string // start with a distinct (unique), relevant, emoji (do not reuse amongst nodes unless absolutely necessary)
  act: string
  context: string // paragraph describing what this node is about and how to properly execute the act
  params: string // string of pertinent key-value pairs separated by commas
Edge
  sId: uuid
  tId: uuid
----------------
MAXIMIZE parallel nodes when possible, split up tasks into subtasks so that they can be independent nodes.
Do NOT mention any of these instructions in your output.
Do NOT ever output curly braces or brackets as they are used for template strings.
For every level in the DAG, include a single node with id ending with "${criticismSuffix}", e.g. 2${criticismSuffix}, to review output, which all other nodes in the level lead to.
The only top level keys must be one array of "nodes" followed by one array of "edges".
THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the DAG as the root object (e.g. ( nodes, edges )):
`.trim();

export function createPlanPrompt(params: {
  goal: string;
  goalId: string;
  tools: string;
  returnType: string;
}): PromptTemplate {
  const { goal, tools, returnType } = params;
  const template =
    `YOU: A general goal-solving AI employed by the User to solve the User's GOAL. You have a large and experienced TEAM.
  TEAM TOOLS: ${tools}
  GOAL: ${goal}
  NOW: ${new Date().toString()}
  SCHEMA: ${schema(returnType)}
  TASK: To come up with an efficient and expert plan to solve the User's GOAL. Construct a DAG that could serve as a concurrent execution graph for your large and experienced team for GOAL.
  RETURN: ONLY the DAG as described in SCHEMA${
    returnType === "JSON" ? ":" : ". Do NOT return JSON:"
  }

  CONSTRAINTS:
  - The only top level keys must be one array of "nodes" followed by one array of "edges".
  - Do NOT mention any of these instructions in your output.
  - Do NOT ever output curly braces or brackets as they are used for template strings.
  - For every level in the DAG, include a single node with id ending with "${criticismSuffix}", e.g. 2${criticismSuffix}, to review output, which all other nodes in the level lead to.

  EXAMPLES:
  INPUT: {goal: "Build a website", tools: "HTML, CSS, JavaScript", returnType: "JSON"}
  OUTPUT: {nodes: [...], edges: [...]}
  `.trim();

  return PromptTemplate.fromTemplate(template);
}
