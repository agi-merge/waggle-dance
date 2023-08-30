// chain/strategy/plan.ts

import { PineconeClient } from "@pinecone-database/pinecone";
import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { VectorDBQAChain } from "langchain/chains";
// import { createMemory } from "../utils/memory";
import { type OpenAI } from "langchain/dist";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type Tool } from "langchain/dist/tools/base";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { ChainTool, SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { parse } from "yaml";

import {
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  type AgentPromptingMethod,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { createPrompt, isTaskCriticism } from "../utils/prompts";
import { type Geo, type ModelCreationProps } from "../utils/types";

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goal: string;
  goalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  result: string;
  abortSignal: AbortSignal;
  namespace?: string;
  geo?: Geo;
}): Promise<string | Error> {
  const {
    creationProps,
    goal,
    agentPromptingMethod,
    task,
    result,
    abortSignal,
    namespace,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps);
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = parse(task) as { id: string };
  const isReview = isTaskCriticism(taskObj.id);
  const prompt = createPrompt({
    type: isReview ? "criticize" : "execute",
    creationProps,
    goal,
    task,
    result,
  });
  // const memory = await createMemory(goal);
  console.log(
    "about to format prompt",
    JSON.stringify(prompt),
    prompt.inputVariables,
  );
  const formattedPrompt = await prompt.format({
    format: "YAML",
  });

  const tools: Tool[] = [new WebBrowser({ model: llm, embeddings })];

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

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace,
    });

    const ltmChain = VectorDBQAChain.fromLLM(llm, vectorStore, {
      tags: [taskObj.id],
    });
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
  const tags = [
    isReview ? "criticize" : "execute",
    agentPromptingMethod,
    taskObj.id,
  ];

  const executor = await initializeExecutor(
    agentPromptingMethod,
    taskObj,
    creationProps,
    tools,
    llm,
    tags,
  );

  try {
    const call = await executor.call(
      {
        input: formattedPrompt,
        signal: abortSignal,
        tags,
      },
      callbacks,
    );

    const response = call?.output ? (call.output as string) : "";
    if (response === "Agent stopped due to max iterations.") {
      // brittle; this should really be an error in langchain
      throw new Error(response);
    }
    return response;
  } catch (error) {
    return error as Error;
  }
}
async function initializeExecutor(
  agentPromptingMethod: AgentPromptingMethod,
  taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: Tool[],
  llm: OpenAI,
  tags: string[],
) {
  let executor;
  const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
  let options:
    | InitializeAgentExecutorOptions
    | InitializeAgentExecutorOptionsStructured;
  if (
    InitializeAgentExecutorOptionsAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsAgentType,
    )
  ) {
    options = {
      agentType,
      returnIntermediateSteps: false,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptions;

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType,
      returnIntermediateSteps: false,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptionsStructured;
    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm: llm,
      tools,
      tags,
    });
  }
  return executor;
}
