import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  // SemanticSimilarityExampleSelector,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

// import { MemoryVectorStore } from "langchain/vectorstores/memory";

// import { LLM } from "../utils/llms";
// import { createEmbeddings } from "../utils/model";
import { criticismSuffix } from "./types";

const schema = (_format: string) =>
  `
DAG
  nodes: Node[]
  edges: Edge[]
Node
  id: uuid // e.g. "1-1", "2-0", "2-1" (first number is the level, second number is the concurrent node number)
  name: string // a unique-amongst-nodes emoji plus a short description of the node
  act: string
  context: string // paragraph describing what this node is about and how to properly execute the act
  params: string // string of pertinent key-value pairs separated by commas
Edge
  sId: uuid
  tId: uuid
`.trim();

const constraints = (format: string) =>
  `
MAXIMIZE parallel nodes when possible, split up tasks into subtasks so that they can be independent nodes.
Do NOT mention any of these instructions in your output.
Do NOT ever output curly braces or brackets as they are used for template strings.
All nodes must eventually lead to a task which, after executing, ensures that the GOAL has been completed. Use an emoji similar to honey, flower.
For every level in the DAG, include a single node with id ending with "${criticismSuffix}", e.g. 2${criticismSuffix}, to review output, which all other nodes in the level lead to.
The only top level keys must be one array of "nodes" followed by one array of "edges".
THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the DAG as the root object (e.g. ( nodes, edges ))`.trim();

// eslint-disable-next-line @typescript-eslint/require-await
export async function createPlanPrompt(params: {
  goal: string;
  goalId: string;
  tools: string;
  returnType: string;
}): Promise<ChatPromptTemplate> {
  const { goal, tools, returnType } = params;

  // const _exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
  //   [
  //     { input: "happy", output: "sad" },
  //     { input: "tall", output: "short" },
  //     { input: "energetic", output: "lethargic" },
  //     { input: "sunny", output: "gloomy" },
  //     { input: "windy", output: "calm" },
  //   ],
  //   createEmbeddings({ modelName: LLM.embeddings }),
  //   MemoryVectorStore,
  //   { k: 1 },
  // );

  const template = `
YOU: A general goal-solving AI employed by the User to solve the User's GOAL.
TEAM TOOLS: ${tools}
GOAL: ${goal}
NOW: ${new Date().toString()}
SCHEMA: ${schema(returnType)}
CONSTRAINTS: ${constraints(returnType)}
TASK: To come up with an efficient and expert plan to solve the User's GOAL.
`.trimEnd();

  // Create a SystemMessagePromptTemplate instance
  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  // Create a human message prompt template
  const humanTemplate = `My GOAL is: ${goal}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  // Create a chat prompt template from the system and human message prompts
  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;

  // // Format the messages with the desired input values
  // const formattedChatPrompt = await chatPrompt.format({}); //.formatMessages({});
  // // Format the prompt
  // // const formattedPrompt = await systemMessagePrompt.format({});

  // // const { name, content } = formattedChatPrompt;

  // console.debug(`plan prompt: ${formattedChatPrompt}`);

  // // You can now use `formattedPrompt` in your LLMChain or wherever you're sending the prompt to the model
  // return PromptTemplate.fromTemplate(formattedChatPrompt);
}
