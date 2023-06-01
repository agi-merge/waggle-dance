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
import { parse, stringify } from "yaml";
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
  const formattedPrompt = await prompt.format({ chat_history: stringify(chat_history), format: "YAML" })

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