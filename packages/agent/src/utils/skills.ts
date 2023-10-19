import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import {
  SearchApi,
  SerpAPI,
  WolframAlphaTool,
  type SearchApiParameters,
  type StructuredTool,
} from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import cca2Map from "../lib/cca2Map.json";
import requestUserHelpSkill from "../skills/requestUserHelpSkill";
import retrieveMemoriesSkill from "../skills/retrieveMemories";
import saveMemoriesSkill from "../skills/saveMemories";
import type Geo from "./Geo";
import { type AgentPromptingMethod } from "./llms";

type CCA2MapType = {
  [key: string]: {
    name: string;
    divisions: { [key: string]: string };
    languages: string[];
  };
};

// literally just here to offer nice names in the UI
class GoogleSearch extends SearchApi {
  static lc_name(): string {
    return "Google Search";
  }
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google" });
    this.name = "Google Search";
  }
}
class GoogleScholar extends SearchApi {
  static lc_name(): string {
    return "Google Scholar";
  }
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google_scholar" });
    this.name = "Google Scholar";
  }
}
class GoogleNews extends SearchApi {
  static lc_name(): string {
    return "Google News";
  }
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google_news" });
    this.name = "Google News";
  }
}
// class YoutubeTranscripts extends SearchApi {
//   static lc_name(): string {
//     return "Youtube Transcripts";
//   }
//   constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
//     super(apiKey, { ...params, engine: "google_youtube_transcripts" });
//     this.name = "Youtube Transcripts";
//   }
// }

function getSearchLocation(geo?: Geo): string {
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
  return location;
}

// skill === tool
function createSkills(
  llm: OpenAI | ChatOpenAI,
  embeddings: Embeddings,
  agentPromptingMethod: AgentPromptingMethod,
  isCriticism: boolean,
  taskId: string,
  returnType: "YAML" | "JSON",
  geo?: Geo,
): StructuredTool[] {
  const tools = [
    requestUserHelpSkill.toTool(agentPromptingMethod, returnType),
    // selfHelpSkill.toTool(agentPromptingMethod, returnType),
    new WebBrowser({ model: llm, embeddings }),
  ];

  // first tasks should not use long-term memory
  if (!taskId.search(/^1-\d+$/)) {
    tools.push(retrieveMemoriesSkill.toTool(agentPromptingMethod, returnType));
  }

  if (!isCriticism) {
    tools.push(saveMemoriesSkill.toTool(agentPromptingMethod, returnType));
  }

  if (process.env.SEARCHAPI_API_KEY?.length) {
    const params: SearchApiParameters = {
      location: getSearchLocation(geo),
      hl: "en", // host language
      gl: "us", // geographic location
    };

    const searchTools = [
      new GoogleSearch(process.env.SEARCHAPI_API_KEY, params),
      new GoogleNews(process.env.SEARCHAPI_API_KEY, params),
      // new YoutubeTranscripts(process.env.SEARCHAPI_API_KEY, params),
      new GoogleScholar(process.env.SEARCHAPI_API_KEY, params),
    ];

    tools.push(...searchTools);
  } else if (process.env.SERPAPI_API_KEY?.length) {
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location: getSearchLocation(geo),
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
