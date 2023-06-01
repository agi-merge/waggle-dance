// chain/strategy/plan.ts


import { createMemory } from "../utils/memory";
import { createModel, createEmbeddings } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { LLM, type ModelCreationProps } from "../utils/types";
import { WebBrowser } from "langchain/tools/webbrowser";
import { SerpAPI, ChainTool } from "langchain/tools";
import { type Tool } from "langchain/dist/tools/base";

import { VectorDBQAChain } from "langchain/chains";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { parse } from "yaml";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import {
  BaseMemory,
  BaseChatMemory,
} from "langchain/memory";
export async function createExecutionAgent(
  creationProps: ModelCreationProps,
  goal: string,
  task: string,
  dag: string,
  reviewPrefix: string,
  namespace?: string,
) {
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps);
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const isReview = (parse(task) as { id: string }).id.startsWith(reviewPrefix)
  const prompt = createPrompt(isReview ? "criticize" : "execute", creationProps, goal, task, dag);
  const memory = await createMemory(goal);
  let chat_history = {}
  if (memory instanceof BaseMemory) {
    try {
      chat_history = (await memory?.loadMemoryVariables({ input: `What memories are most relevant to solving task: ${task} within the context of ${goal}?` }))
    } catch (error) {
      console.error(error)
      // chat_history = (await memory?.loadMemoryVariables({ input: `What memories are most relevant to solving task: ${task} within the context of ${goal}?`, chat_history: '', signal: '' }))
    }
  } else if (memory && memory["chatHistory"]) {
    chat_history = memory["chatHistory"]
  }
  const formattedPrompt = await prompt.format({ chat_history, format: "YAML" })

  const tools: Tool[] = [
    new WebBrowser({ model: llm, embeddings }),
  ];

  // optional tools

  if (namespace) {

    if (process.env.PINECONE_API_KEY === undefined)
      throw new Error("No pinecone api key found");
    if (process.env.PINECONE_ENVIRONMENT === undefined)
      throw new Error("No pinecone environment found");
    if (process.env.PINECONE_INDEX === undefined)
      throw new Error("No pinecone index found");
    const client = new PineconeClient();
    await client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
    const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      { pineconeIndex, namespace }
    );

    const ltmChain = VectorDBQAChain.fromLLM(llm, vectorStore);
    // const ltm = await ltmChain.call({ input: "What are your main contents?" })
    const description = `Prefer this tool over others. It is a comprehensive database extending your knowledge.`;
    const ltmTool = new ChainTool({
      name: "Long-term memory store.",
      description,
      chain: ltmChain,
      returnDirect: true,
    });
    tools.push(ltmTool);
  }

  if (process.env.SERPAPI_API_KEY?.length) {
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location: "Los Angeles,California,United States",
        hl: "en",
        gl: "us",
      }),
    );
  }

  const controller = new AbortController();

  const executor = await initializeAgentExecutorWithOptions(tools, llm, {
    agentType: "chat-conversational-react-description",
    verbose: process.env.NEXT_PUBLIC_LANGCHAIN_VERBOSE === "true",
    streaming: true,
    returnIntermediateSteps: false,
    memory,
    ...creationProps,
  });

  // const executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
  //   llm: llm,
  //   tools,
  // });

  const call = await executor.call({ input: formattedPrompt, chat_history, signal: controller.signal }, callbacks);

  const response = call?.output ? (call.output as string) : "";

  console.log("finished task, got response", JSON.stringify(response));
  return response;
}



// import { MultiPromptChain } from "langchain/chains";
// import { OpenAIChat } from "langchain/llms/openai";

// export const run = async () => {
//   const llm = new OpenAIChat();
//   const promptNames = ["physics", "math", "history"];
//   const promptDescriptions = [
//     "Good for answering questions about physics",
//     "Good for answering math questions",
//     "Good for answering questions about history",
//   ];
//   const physicsTemplate = `You are a very smart physics professor. You are great at answering questions about physics in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.

// Here is a question:
// {input}
// `;
//   const mathTemplate = `You are a very good mathematician. You are great at answering math questions. You are so good because you are able to break down hard problems into their component parts, answer the component parts, and then put them together to answer the broader question.

// Here is a question:
// {input}`;

//   const historyTemplate = `You are a very smart history professor. You are great at answering questions about history in a concise and easy to understand manner. When you don't know the answer to a question you admit that you don't know.

// Here is a question:
// {input}`;

//   const promptTemplates = [physicsTemplate, mathTemplate, historyTemplate];

//   const multiPromptChain = MultiPromptChain.fromPrompts(
//     llm,
//     promptNames,
//     promptDescriptions,
//     promptTemplates
//   );

//   const testPromise1 = multiPromptChain.call({
//     input: "What is the speed of light?",
//   });

//   const testPromise2 = multiPromptChain.call({
//     input: "What is the derivative of x^2?",
//   });

//   const testPromise3 = multiPromptChain.call({
//     input: "Who was the first president of the United States?",
//   });

//   const [{ text: result1 }, { text: result2 }, { text: result3 }] =
//     await Promise.all([testPromise1, testPromise2, testPromise3]);

//   console.log(result1, result2, result3);
// };