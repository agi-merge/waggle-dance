import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import { SerpAPI, type StructuredTool } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import retrieveMemorySkill from "../skills/retrieveMemory";
import saveMemorySkill from "../skills/saveMemory";
import type Geo from "../strategy/Geo";
import { type AgentPromptingMethod } from "./llms";

// skill === tool
function createSkills(
  llm: OpenAI | ChatOpenAI,
  embeddings: Embeddings,
  agentPromptingMethod: AgentPromptingMethod,
  returnType: "YAML" | "JSON",
  geo?: Geo,
): StructuredTool[] {
  const tools = [
    saveMemorySkill.toTool(agentPromptingMethod, returnType),
    retrieveMemorySkill.toTool(agentPromptingMethod, returnType),
    new WebBrowser({ model: llm, embeddings }),
  ];

  if (process.env.SERPAPI_API_KEY?.length) {
    console.debug(`createSkills: adding SerpAPI`);
    const location = geo
      ? `${geo.city},${geo.region},${geo.country}`
      : "Los Angeles,California,United States";
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location,
        hl: "en",
        gl: "us",
      }),
    );
  }

  return tools as StructuredTool[];
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
