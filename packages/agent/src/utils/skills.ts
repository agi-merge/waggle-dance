import { PineconeClient } from "@pinecone-database/pinecone";
import { type Callbacks } from "langchain/callbacks";
import { VectorDBQAChain } from "langchain/chains";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type OpenAI } from "langchain/dist";
import { type Tool } from "langchain/dist/tools/base";
import { type Embeddings } from "langchain/embeddings";
import { ChainTool, SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import saveMemorySkill from "../skills/saveMemory";
import { AgentPromptingMethod, LLM_ALIASES } from "./llms";
import { createModel } from "./model";

// skill === tool
async function createSkills(
  namespace: string | undefined,
  llm: OpenAI | ChatOpenAI,
  embeddings: Embeddings,
  tags: string[],
  callbacks: Callbacks | undefined,
): Promise<Tool[]> {
  const tools: Tool[] = [
    new WebBrowser({ model: llm, embeddings }),
    saveMemorySkill,
  ];

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
    const stats = await pineconeIndex.describeIndexStats({
      describeIndexStatsRequest: {},
    });
    // TODO: it may be possible to have the namespace be created partway through the execution of the agent
    if (stats.namespaces?.length && stats.namespaces[namespace]) {
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        pineconeIndex,
        namespace,
      });

      const ltmChain = VectorDBQAChain.fromLLM(
        createModel(
          { modelName: LLM_ALIASES["fast"], maxTokens: 300 },
          AgentPromptingMethod.OpenAIFunctions,
        ),
        vectorStore,
        {
          tags,
          callbacks,
        },
      );

      const description = `*MANDATORY: ONLY CALL UP TO ONCE PER STEP* a comprehensive database extending your knowledge/memory; use this tool before other tools. Provide as much context as necessary to do a semantic search.`;
      const ltmTool = new ChainTool({
        name: "memory database",
        description,
        chain: ltmChain,
      });

      tools.push(ltmTool);
    }
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

  return tools;
}

// returns the count that would be created given a config, without actually instantiating the skills
export function createSkillsCount(namespace: string) {
  return namespace
    ? process.env.SERPAPI_API_KEY
      ? 4
      : 3
    : process.env.SERPAPI_API_KEY
    ? 3
    : 2;
}

export default createSkills;
