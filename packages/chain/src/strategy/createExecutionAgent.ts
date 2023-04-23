// chain/strategy/plan.ts


import { createMemory } from "../utils/memory";
import { createModel, createEmbeddings } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";
import { WebBrowser } from "langchain/tools/webbrowser";
import { SerpAPI, ChainTool } from "langchain/tools";
import { type Tool } from "langchain/dist/tools/base";

import { VectorDBQAChain } from "langchain/chains";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { parse, stringify } from "yaml";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { initializeAgentExecutorWithOptions, type InitializeAgentExecutorOptions } from "langchain/agents";
import {
  BaseMemory,
} from "langchain/memory";
import { AgentPromptingMethod, LLM, getAgentPromptingMethodValue } from "../utils/llms";
export async function createExecutionAgent(creation: {
  creationProps: ModelCreationProps,
  goal: string,
  goalId: string,
  agentPromptingMethod: AgentPromptingMethod,
  task: string,
  dag: string,
  result: string,
  reviewPrefix: string,
  abortSignal: AbortSignal,
  namespace?: string,
}): Promise<string | Error> {
  const { creationProps, goal, agentPromptingMethod, task, dag, result, reviewPrefix, abortSignal, namespace } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps);
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = (parse(task) as { id: string })
  const isReview = taskObj.id.startsWith(reviewPrefix) || taskObj.id.startsWith("criticize-")
  const prompt = createPrompt(isReview ? "criticize" : "execute", creationProps, goal, task, dag, result, reviewPrefix);
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
    const description = ` a comprehensive database extending your knowledge/memory; use this tool before other tools.`;
    const ltmTool = new ChainTool({
      name: "memory database",
      description,
      chain: ltmChain,
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

  let executor;
  if (agentPromptingMethod !== AgentPromptingMethod.PlanAndExecute) {
    const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
    const options: InitializeAgentExecutorOptions = {
      agentType,
      streaming: true,
      maxIterations: 25,
      returnIntermediateSteps: false,
      ...creationProps,
    };

    // Only include the memory parameter for "chat-conversational-react-description" agent type
    if (agentType === "chat-conversational-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm: llm,
      tools,
    });
  }

  try {
    const call = await executor.call({ input: formattedPrompt, chat_history, signal: abortSignal }, callbacks);

    const response = call?.output ? (call.output as string) : "";
    if (response === "Agent stopped due to max iterations.") { // brittle; this should really be an error in langchain
      throw new Error(response)
    }
    return response;
  } catch (error) {
    return error as Error
  }
}