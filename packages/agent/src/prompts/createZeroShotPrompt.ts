// agent/prompts/createZeroShotPrompt.ts
// TODO: Implement multi-prompt to shortcut simple ChatGPT-without-plugins answerable questions.
// 1. In callPlanAgent, construct the plan prompt as normal
// 2. Construct a prompt here, following similar patterns as createPlanPrompt, but one that encourages the LLM to answer without multiple steps.
// 3. In callPlanAgent, construct a custom fork of MultiPromptChain (check out langchain/dist/chains/router/multi_prompt and implement a specialized version that returns the index of the prompt to use)
// 4. finally, after indexing into the prompts, pass it into the LLM and return the result.
// 5. Optional: this logic could be rolled up into refine possibly once it is implemented
// et voila! The app will respond quickly if it judges the question to be trivial

import { MultiPromptChain } from "langchain/chains";
import { OpenAIChat } from "langchain/llms/openai";

const llm = new OpenAIChat();
const promptNames = ["physics", "math", "history"];
const promptDescriptions = [
  "Good for answering questions about physics",
  "Good for answering math questions",
  "Good for answering questions about history",
];
const physicsTemplate = `You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.

Here is a question:
{input}
`;
const mathTemplate = `You are a very good mathematician. You are great at answering math questions. You are so good because you are able to break down hard problems into their component parts, answer the component parts, and then put them together to answer the broader question.

Here is a question:
{input}`;

const historyTemplate = `You are a very smart history professor. You are great at answering questions about history in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.

Here is a question:
{input}`;

const promptTemplates = [physicsTemplate, mathTemplate, historyTemplate];

const multiPromptChain = MultiPromptChain.fromLLMAndPrompts(llm, {
  promptNames,
  promptDescriptions,
  promptTemplates,
});

const testPromise1 = multiPromptChain.call({
  input: "What is the speed of light?",
});

const testPromise2 = multiPromptChain.call({
  input: "What is the derivative of x^2?",
});

const testPromise3 = multiPromptChain.call({
  input: "Who was the first president of the United States?",
});

const [{ text: result1 }, { text: result2 }, { text: result3 }] =
  await Promise.all([testPromise1, testPromise2, testPromise3]);

console.log(result1, result2, result3);
