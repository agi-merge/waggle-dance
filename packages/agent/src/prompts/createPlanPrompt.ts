import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

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
Edge
  sId: uuid
  tId: uuid
`.trim();
// const _highQualityExamples = [
//   {
//     input:
//       "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
//     output: {
//       nodes: [
//         {
//           id: "1-1",
//           name: "Research rooftop distributed solar",
//           act: "research",
//           context:
//             "Conduct an in-depth research on the costs, benefits, regional differences, and risks of implementing rooftop distributed solar. Gather data from reliable sources.",
//         },
//         {
//           id: "1-2",
//           name: "Research utility-scale solar",
//           act: "research",
//           context:
//             "Investigate the costs, benefits, regional differences, and risks of utility-scale solar. Ensure the information is up-to-date and accurate.",
//         },
//         {
//           id: "1-3",
//           name: "Research community solar",
//           act: "research",
//           context:
//             "Study the costs, benefits, regional differences, and risks of community solar. Information should be comprehensive and relevant.",
//         },
//         {
//           id: "2-1",
//           name: "Compile Research",
//           act: "compile",
//           context:
//             "Compile the researched data in a structured format for easy comparison.",
//         },
//         {
//           id: "2-2",
//           name: "Write markdown document",
//           act: "write",
//           context:
//             "Write a markdown document that compares and contrasts the researched information. The document should be clear, concise, and well-structured.",
//         },
//       ],
//       edges: [
//         { sId: "1-1", tId: "2-1" },
//         { sId: "1-2", tId: "2-1" },
//         { sId: "1-3", tId: "2-1" },
//         { sId: "2-1", tId: "2-2" },
//       ],
//     },
//   },
//   {
//     input:
//       "I need to find the most talked-about books in the self-help genre in 2023. Provide a list of top 10 books along with their brief summaries.",
//     output: {
//       nodes: [
//         {
//           id: "1-1",
//           name: "Research books",
//           act: "research",
//           context:
//             "Research the most talked-about books in the self-help genre in 2023. Use reliable sources like top book review sites, bestseller lists, and reader reviews.",
//         },
//         {
//           id: "2-1",
//           name: "Select top 10 books",
//           act: "select",
//           context:
//             "From the researched books, select the top 10 based on factors like popularity, reviews, and relevance.",
//         },
//         {
//           id: "3-1",
//           name: "Summarize books",
//           act: "summarize",
//           context:
//             "Provide brief summaries for the top 10 books. Each summary should highlight the key points of the book.",
//         },
//       ],
//       edges: [
//         { sId: "1-1", tId: "2-1" },
//         { sId: "2-1", tId: "3-1" },
//       ],
//     },
//   },
//   {
//     input:
//       "What are the top trending toys for 6-8 year olds on Amazon in April 2023? Provide a list with their prices and customer ratings.",
//     output: {
//       nodes: [
//         {
//           id: "1-1",
//           name: "Research trending toys",
//           act: "research",
//           context:
//             "Research the top trending toys for 6-8 year olds on Amazon in April 2023. Find reliable sources that provide accurate trends.",
//         },
//         {
//           id: "2-1",
//           name: "List toys with prices and ratings",
//           act: "list",
//           context:
//             "From the researched toys, list them along with their prices and customer ratings. Ensure the information is accurate and up-to-date.",
//         },
//       ],
//       edges: [{ sId: "1-1", tId: "2-1" }],
//     },
//   },
//   {
//     input:
//       "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years?",
//     output: {
//       nodes: [
//         {
//           id: "1-1",
//           name: "Research successful digital marketing startups",
//           act: "research",
//           context:
//             "Research successful digital marketing startups in the last two years. Find reliable sources that provide detailed information about their strategies.",
//         },
//         {
//           id: "2-1",
//           name: "Identify key steps and strategies",
//           act: "identify",
//           context:
//             "From the researched startups, identify the key steps and strategies they used. Look for common trends and unique approaches.",
//         },
//         {
//           id: "3-1",
//           name: "Compile steps and strategies",
//           act: "compile",
//           context:
//             "Compile the identified steps and strategies in a clear and organized manner. The information should be easy to understand and apply.",
//         },
//       ],
//       edges: [
//         { sId: "1-1", tId: "2-1" },
//         { sId: "2-1", tId: "3-1" },
//       ],
//     },
//   },
// ];

const constraints = (format: string) =>
  `
If the GOAL can be confidently (100%) answered by you as a large language model, only include one task in the DAG, which is the GOAL.
The DAG must be minimal, i.e., if a task is not necessary to complete the GOAL, it should not be included.
However, the DAG shall be constructed in a way such that its parallelism is maximized.
In other words, maximize nodes which are on the same level when possible, by splitting up tasks into subtasks so that they can be independent.
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
  returnType: "JSON" | "YAML";
}): Promise<ChatPromptTemplate> {
  const { goal, tools, returnType } = params;

  // Convert highQualityExamples to the desired format
  // const formattedHighQualityExamples = highQualityExamples.map((example) => {
  //   const formattedOutput =
  //     returnType === "JSON"
  //       ? jsonStringify(example.output)
  //       : yamlStringify(example.output);

  //   return {
  //     ...example,
  //     output: formattedOutput,
  //   };
  // });

  // const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
  //   formattedHighQualityExamples,
  //   createEmbeddings({ modelName: LLM.embeddings }),
  //   MemoryVectorStore,
  //   { k: 2 },
  // );

  const template = `
YOU: A general goal-solving AI employed by the User to solve the User's GOAL.
TEAM TOOLS: ${tools}
GOAL: ${goal}
NOW: ${new Date().toString()}
SCHEMA: ${schema(returnType)}
CONSTRAINTS: ${constraints(returnType)}
TASK: To come up with an efficient and expert plan to solve the User's GOAL, according to SCHEMA:
`.trimEnd();

  // Create a prompt template that will be used to format the examples.
  // const examplePrompt = new PromptTemplate({
  //   inputVariables: ["input", "output"],
  //   template: `Input:\n{input}\nOutput:\n{output}`,
  // });
  // Create a FewShotPromptTemplate that will use the example selector.
  // const dynamicPrompt = new FewShotPromptTemplate({
  //   // We provide an ExampleSelector instead of examples.
  //   exampleSelector,
  //   examplePrompt,
  //   prefix: "",
  //   suffix: "",
  //   inputVariables: [],
  // });
  // Input is about the weather, so should select eg. the sunny/gloomy example

  // const examples = await Promise.all(
  //   exampleInputs.map((input) => dynamicPrompt.format(input)),
  // );
  // const examples = await dynamicPrompt.format({ goal });
  // console.debug(`examples: ${examples}`);

  // Create a SystemMessagePromptTemplate instance
  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  // const examplesTemplate = `Here are some example GOAL and DAG pairs: ${examples}`;
  // const _examplesMessagePrompt =
  // SystemMessagePromptTemplate.fromTemplate(examplesTemplate);

  // Create a human message prompt template
  const humanTemplate = `My GOAL is: ${goal}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  // Create a chat prompt template from the system and human message prompts
  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    // examplesMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}
