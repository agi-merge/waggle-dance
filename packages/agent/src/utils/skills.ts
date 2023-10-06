import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import {
  SerpAPI,
  WolframAlphaTool,
  type StructuredTool,
} from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import requestUserHelpSkill from "../skills/requestUserHelpSkill";
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
    requestUserHelpSkill.toTool(agentPromptingMethod, returnType),
    // selfHelpSkill.toTool(agentPromptingMethod, returnType),
    new WebBrowser({ model: llm, embeddings }),
  ];

  if (process.env.SERPAPI_API_KEY?.length) {
    console.debug(`createSkills: adding SerpAPI`);
    const geos: string[] = [];
    if (geo) {
      if (geo.city) {
        geos.push(geo.city);
      }
      if (geo.region) {
        geos.push(geo.region);
      }
      if (geo.country) {
        geos.push(geo.country);
      }
    }
    const location =
      geos.length > 0 ? geos.join(",") : "Los Angeles,California,United States";
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location,
        hl: "en",
        gl: "us",
      }),
    );
  }

  if (process.env.WOLFRAM_APP_ID?.length) {
    console.debug(`createSkills: adding WolframAlpha`);
    tools.push(
      new WolframAlphaTool({
        appid: process.env.WOLFRAM_APP_ID,
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
