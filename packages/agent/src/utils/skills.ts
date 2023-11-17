import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import {
  JsonSpec,
  SearchApi,
  SerpAPI,
  WolframAlphaTool,
  type JsonObject,
  type SearchApiParameters,
  type StructuredTool,
} from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import cca2Map from "../lib/cca2Map.json";
import { AgentProtocolToolkit } from "../skills/AgentProtocolToolkit";
import downloadFileSkill from "../skills/downloadFileSkill";
import requestUserHelpSkill from "../skills/requestUserHelpSkill";
import uploadFileSkill from "../skills/uploadFileSkill";
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
  description =
    "Scrapes real time Google results. Try to avoid SEO spam and treat results with skepticism.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google" });
    this.name = "Google Search";
  }
}
class GoogleTrends extends SearchApi {
  static lc_name(): string {
    return "Google Trends";
  }
  description =
    "Scrapes real time Google Trends results, via interest over time.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    // FIXME: wrap to configure data_type
    super(apiKey, {
      ...params,
      engine: "google_trends",
      data_type: "TIMESERIES",
    });
    this.name = "Google Trends";
  }
}
class GoogleScholar extends SearchApi {
  static lc_name(): string {
    return "Google Scholar";
  }
  description =
    "Scrapes real time results. Google Scholar API lets users search for academic content like articles, theses, and books from various sources.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google_scholar" });
    this.name = "Google Scholar";
  }
}
class GoogleNews extends SearchApi {
  static lc_name(): string {
    return "Google News";
  }
  description =
    "Scrapes real-time results. Google News API offers an automated news aggregation service. It collects headlines from various sources globally, categorizes similar articles and presents them based on each user's interests.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google_news" });
    this.name = "Google News";
  }
}
class GoogleShopping extends SearchApi {
  static lc_name(): string {
    return "Google Shopping";
  }
  description =
    "Scrapes real-time results.The Google Shopping API delivers a dynamic product search and comparison service.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "google_shopping" });
    this.name = "Google Shopping";
  }
}
class YouTube extends SearchApi {
  static lc_name(): string {
    return "YouTube";
  }
  description =
    "YouTube Search API scrapes real-time search results. It parses ads, videos, shorts, search suggestions, channels, playlists, and more.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "youtube" });
    this.name = "YouTube";
  }
}
// FIXME: video_id is required. this must be wrapped i believe
// class YouTubeTranscripts extends SearchApi {
//   static lc_name(): string {
//     return "YouTube Transcripts";
//   }
//   description =
//     "Required: `video_id` param. You must already have found some `video_id` before using this. YouTube Transcripts API allows you to get real-time transcript/subtitles for a given YouTube video.";
//   constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
//     super(apiKey, { ...params, engine: "youtube_transcripts" });
//     this.name = "YouTube Transcripts";
//   }
// }

type OrganicResult = {
  position?: number;
  asin?: string;
  title?: string;
  link?: string;
  rating?: number;
  reviews?: number;
  price?: string;
  extracted_price?: number;
  original_price?: string;
  extracted_original_price?: number;
  is_prime?: boolean;
  is_climate_pledge_friendly?: boolean;
  thumbnail: string;
};

const makePrettyOrganicResult = (r: OrganicResult): string => {
  return `${r.position}. (ASIN: ${r.asin}) ${r.title?.slice(0, 75)}…\n${
    r.rating
  } stars from ${r.reviews} reviews\n${r.price}\n${r.is_prime ? "Prime" : ""} ${
    r.is_climate_pledge_friendly ? "Climate Pledge" : ""
  }`;
};

class AmazonSearch extends SearchApi {
  static lc_name(): string {
    return "Amazon Search";
  }
  description =
    "Scrapes real-time Amazon search results. The Amazon Search API lets developers tap into Amazon's huge product database. You can search for items, get sorted results based on relevance or reviews, and pull product details.";
  constructor(apiKey: string, params: Omit<SearchApiParameters, "engine">) {
    super(apiKey, { ...params, engine: "amazon_search" });
    this.name = "Amazon Search";
  }
  async _call(input: string): Promise<string> {
    // const call = await super._call(input);
    // return call;
    const resp = await fetch(this.buildUrl(input));
    const json = (await resp.json()) as {
      organic_results?: OrganicResult[];
      error?: string;
    };
    if (json.error) {
      throw new Error(
        `Failed to load search results from SearchApi due to: ${json.error}`,
      );
    }
    // Amazon Search results
    if (json.organic_results?.slice(0, 10)) {
      return json.organic_results.map(makePrettyOrganicResult).join("\n");
    }

    return "Error: unexpected response from Amazon Search";
  }
}

function getSearchLocation(
  destination: "SerpAPI" | "SearchApi",
  geo?: Geo,
): { location: string; hl: string; gl: string } {
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
    if (destination !== "SearchApi") {
      if (serpGeo.region) {
        geos.push(serpGeo.region);
      }
      if (serpGeo.country) {
        geos.push(serpGeo.country);
      }
    }
  }

  const hl = languages?.split(",")?.[0]?.toLowerCase() || "en";
  const gl = geo?.country?.toLowerCase() || "us";

  const location =
    geos.length > 0 ? geos.join(",") : "Los Angeles,California,United States";

  return { location, hl, gl };
}

export const requiredSkills = (
  agentPromptingMethod: AgentPromptingMethod,
  returnType: "YAML" | "JSON",
): StructuredTool[] => [
  requestUserHelpSkill.toTool(agentPromptingMethod, returnType),
  // selfHelpSkill.toTool(agentPromptingMethod, returnType),
];

export const removeRequiredSkills = (
  skills: StructuredTool[],
  agentPromptingMethod: AgentPromptingMethod,
  returnType: "YAML" | "JSON",
) => {
  const reqs = new Set(requiredSkills(agentPromptingMethod, returnType));
  return skills.filter((s) => !reqs.has(s));
};

// skill === tool
function createSkills(
  llm: OpenAI | ChatOpenAI,
  embeddings: Embeddings,
  agentPromptingMethod: AgentPromptingMethod,
  isCriticism: boolean,
  taskId: string,
  returnType: "YAML" | "JSON",
  agentProtocolOpenAPISpec?: JsonObject,
  geo?: Geo,
): StructuredTool[] {
  const tools = [
    ...requiredSkills(agentPromptingMethod, returnType),
    uploadFileSkill.toTool(agentPromptingMethod, returnType),
    downloadFileSkill.toTool(agentPromptingMethod, returnType),
    new WebBrowser({ model: llm, embeddings }),
  ];

  if (process.env.SEARCHAPI_API_KEY?.length) {
    const { location, gl } = getSearchLocation("SearchApi", geo);
    const params: SearchApiParameters = {
      location,
      // hl, // host language
      gl, // geographic location
    };

    const searchTools = [
      new GoogleSearch(process.env.SEARCHAPI_API_KEY, params),
      new GoogleNews(process.env.SEARCHAPI_API_KEY, params),
      new YouTube(process.env.SEARCHAPI_API_KEY, params),
      // new YouTubeTranscripts(process.env.SEARCHAPI_API_KEY, params),
      new GoogleScholar(process.env.SEARCHAPI_API_KEY, params),
      new GoogleTrends(process.env.SEARCHAPI_API_KEY, params),
      new GoogleShopping(process.env.SEARCHAPI_API_KEY, params),
      new AmazonSearch(process.env.SEARCHAPI_API_KEY, params),
    ];

    tools.push(...searchTools);
  } else if (process.env.SERPAPI_API_KEY?.length) {
    const { location, gl } = getSearchLocation("SerpAPI", geo);
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location,
        // hl, // host language
        gl, // geographic location
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

  if (agentProtocolOpenAPISpec) {
    const openAPISpec = new JsonSpec(agentProtocolOpenAPISpec);
    const toolkit = new AgentProtocolToolkit(openAPISpec, llm, {});
    tools.push(...toolkit.tools);
  }

  return tools as StructuredTool[];
}

export default createSkills;
