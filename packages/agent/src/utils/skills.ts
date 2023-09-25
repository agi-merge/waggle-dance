import { type Callbacks } from "langchain/callbacks";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type Tool } from "langchain/dist/tools/base";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import { SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import retrieveMemorySkill from "../skills/retrieveMemory";
import saveMemorySkill from "../skills/saveMemory";

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
    retrieveMemorySkill,
  ];

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
