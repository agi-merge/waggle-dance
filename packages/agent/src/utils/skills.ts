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
  isCriticism: boolean,
  returnType: "YAML" | "JSON",
  geo?: Geo,
): StructuredTool[] {
  const tools = [
    retrieveMemorySkill.toTool(agentPromptingMethod, returnType),
    requestUserHelpSkill.toTool(agentPromptingMethod, returnType),
    // selfHelpSkill.toTool(agentPromptingMethod, returnType),
    new WebBrowser({ model: llm, embeddings }),
  ];

  if (!isCriticism) {
    tools.push(saveMemorySkill.toTool(agentPromptingMethod, returnType));
  }

  if (process.env.SERPAPI_API_KEY?.length) {
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
    console.debug(`SerpAPI location: ${location}`);
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location,
        hl: "en",
        gl: "us",
      }),
    );
  }

  if (process.env.WOLFRAM_APP_ID?.length) {
    tools.push(
      new WolframAlphaTool({
        appid: process.env.WOLFRAM_APP_ID,
      }),
    );
  }

  console.debug(
    tools.map((tool) => {
      return { name: tool.name, description: tool.description };
    }),
  );
  return tools as StructuredTool[];
}

export default createSkills;
