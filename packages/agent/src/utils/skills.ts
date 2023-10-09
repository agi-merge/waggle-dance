import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import {
  SerpAPI,
  WolframAlphaTool,
  type StructuredTool,
} from "langchain/tools";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";

import cca2Map from "../lib/cca2Map.json";
import requestUserHelpSkill from "../skills/requestUserHelpSkill";
import retrieveMemorySkill from "../skills/retrieveMemory";
import saveMemorySkill from "../skills/saveMemory";
import type Geo from "../strategy/Geo";
import { type AgentPromptingMethod } from "./llms";

type CCA2MapType = {
  [key: string]: {
    name: string;
    divisions: { [key: string]: string };
    languages: string[];
  };
};

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
    new Calculator(),
    new WebBrowser({ model: llm, embeddings }),
  ];

  if (!isCriticism) {
    tools.push(saveMemorySkill.toTool(agentPromptingMethod, returnType));
  }

  if (process.env.SERPAPI_API_KEY?.length) {
    const cca2 = geo?.country || "US";
    const city = geo?.city || "San Francisco";
    const region = geo?.region || "CA";

    const countryInfo = (cca2Map as CCA2MapType)[cca2];
    const friendlyCountryName = countryInfo?.name;
    const friendlyRegionName = countryInfo?.divisions[region];

    const languages =
      countryInfo && Object.values(countryInfo.languages).join(", ");

    const geos: string[] = [];

    const serpGeo = {
      country: friendlyCountryName || geo?.country,
      city: city,
      region: friendlyRegionName || geo?.region,
      languages: languages || [],
    };
    if (serpGeo) {
      if (serpGeo.city) {
        geos.push(serpGeo.city);
      }
      if (serpGeo.region) {
        geos.push(serpGeo.region);
      }
      if (serpGeo.country) {
        geos.push(serpGeo.country);
      }
    }
    const location =
      geos.length > 0 ? geos.join(",") : "Los Angeles,California,United States";

    console.debug(
      `SerpAPI location: ${location}, versus original: ${JSON.stringify(geo)}}`,
    );
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location,
        hl: "en", // host language
        gl: "us", // geographic location
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

  console.debug(tools.map((tool) => tool.name));
  return tools as StructuredTool[];
}

export default createSkills;
