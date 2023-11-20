// createContextAndToolsPrompt.ts

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

export type ToolsAndContextPickingInput = {
  task: string;
  inServiceOfGoal: string;
  longTermMemories: string;
  availableTools: string[];
};

export type ToolsAndContextPickingOutput = {
  synthesizedContext: string[];
  tools: string[];
};

type ToolsAndContextExample = {
  exampleRemarks: object;
  input: ToolsAndContextPickingInput;
  output: ToolsAndContextPickingOutput;
};

const toolsAndContextExamples: ToolsAndContextExample[] = [
  {
    exampleRemarks: {
      "Self-Awareness":
        "As a LLM, it is implied that the agent can understand HTML, CSS, etc, so no superfluous information was added to the context.",
      "Input Variables":
        "All necessary input variables like  URL were included directly in the context.",
      "Formatting Safety":
        "Special characters which could have wrapped the URL, such as single quotes, were escaped or omitted.",
      Terse:
        "Lack of long-term memory is not called out, which helps reduce response length and increase relevant context density.",
    },
    input: {
      task: "Access and extract text from https://silennaihin.com/random/plain.html",
      inServiceOfGoal:
        "Open https://silennaihin.com/random/plain.html and paste all of the text on the page in a .txt file",
      longTermMemories: "",
      availableTools: [
        "Figma",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub Search",
        "Write File",
        "JavaScript eval()",
      ],
    },
    output: {
      synthesizedContext: [
        "The task involves accessing and extracting text from a website: https://silennaihin.com/random/plain.html, and writing it to a .txt file.",
        "The text shall not be interpreted or summarized, only extracted.",
        "If the web browser is not fruitful, try using a more advanced scraping library by running JavaScript",
      ],
      tools: ["Web Browser", "Write File", "JavaScript eval()"],
    },
  },

  {
    exampleRemarks: {
      contextDepth:
        "The context delves into the intricacies of stock market analysis, highlighting the volatility of the market and the complexity of predicting future trends.",
    },
    input: {
      task: "Analyze stock market trends",
      inServiceOfGoal:
        "Analyze the stock market trends for the past 5 years and predict the future trends. Create a .xlsx report of the findings.",
      longTermMemories:
        "Previously, I have analyzed stock market trends for shorter periods.",
      availableTools: [
        "Retrieve Memories",
        "Save Memories",
        "Bloomberg Terminal",
        "Google Finance",
        "Yahoo Finance",
        "Excel",
        "Financial Analysis Tools",
        "Stock Market Databases",
      ],
    },
    output: {
      synthesizedContext: [
        "The task involves analyzing stock market trends over the past 5 years and making predictions about future trends.",
        "The stock market is inherently volatile, with many factors influencing trends. This makes analysis a complex task.",
        "In the past, I have analyzed stock market trends for shorter periods, which may provide some insight into the current task.",
      ],
      tools: ["Retrieve Memories", "Bloomberg Terminal", "Google Finance"],
    },
  },

  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the limitations of the agent's knowledge.",
      taskChallenge:
        "The task is complex and requires a deep understanding of AI technologies. The agent will need to navigate a vast amount of information and distill it into a concise and informative report.",
    },
    input: {
      task: "Research AgentGPT",
      inServiceOfGoal:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
      longTermMemories:
        "Previously, I have researched similar AI technologies.",
      availableTools: [
        "Memory Retrieval",
        "Memory Storage",
        "Web Browser",
        "Google Search",
        "Google News",
        "YouTube",
        "Bloomberg Terminal",
        "Google Scholar",
        "Google Trends",
        "Amazon Search",
        "IMDB Search",
        "arXiv",
        "GitHub",
        "Wikipedia",
        "Reddit",
        "Twitter",
      ],
    },
    output: {
      synthesizedContext: [
        "The task is to research AgentGPT, and find similar projects or state of the art research papers.",
        "My training data prior to my knowledge cut-off does not contain coherent information about AgentGPT",
        "In the past, I have researched similar AI technologies, which may provide some insight into the current task.",
      ],
      tools: [
        "Memory Retrieval",
        "Google Search",
        "Google Scholar",
        "arXiv",
        "GitHub",
      ],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the importance of long-term memory in performing tasks.",
      taskChallenge:
        "The task is complex and requires a deep understanding of programming languages. The agent will need to leverage its long-term memory to complete the task efficiently.",
    },
    input: {
      task: "Write a Python script to scrape data from a website",
      inServiceOfGoal:
        "Write a Python script to scrape data from https://example.com and store the data in a CSV file.",
      longTermMemories:
        "Previously, I have written a similar Python script to scrape data from a different website.",
      availableTools: [
        "Python",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub Search",
        "Write File",
      ],
    },
    output: {
      synthesizedContext: [
        "The task is to write a Python script to scrape data from https://example.com and store the data in a CSV file.",
        "In the past, I have written a similar Python script to scrape data from a different website. This experience will be crucial in completing the current task.",
      ],
      tools: ["Python", "Google Search", "Stack Overflow", "Write File"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the limitations of the agent's knowledge.",
      taskChallenge:
        "The task is complex and requires a deep understanding of AI technologies. The agent will need to navigate a vast amount of information and distill it into a concise and informative report.",
    },
    input: {
      task: "Research AgentGPT",
      inServiceOfGoal:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
      longTermMemories:
        "Previously, I have researched similar AI technologies.",
      availableTools: [
        "Memory Retrieval",
        "Memory Storage",
        "Web Browser",
        "Google Search",
        "Google News",
        "YouTube",
        "Bloomberg Terminal",
        "Google Scholar",
        "Google Trends",
        "Amazon Search",
        "IMDB Search",
        "arXiv",
        "GitHub",
        "Wikipedia",
        "Reddit",
        "Twitter",
      ],
    },
    output: {
      synthesizedContext: [
        "The task is to research AgentGPT, and find similar projects or state of the art research papers.",
        "My training data prior to my knowledge cut-off does not contain coherent information about AgentGPT",
        "In the past, I have researched similar AI technologies, which may provide some insight into the current task.",
      ],
      tools: [
        "Memory Retrieval",
        "Google Search",
        "Google Scholar",
        "arXiv",
        "GitHub",
      ],
    },
  },
];

export function createContextAndToolsPrompt({
  returnType,
  inputTaskAndGoalString,
}: {
  returnType: "JSON" | "YAML";
  inputTaskAndGoalString: string;
}): ChatPromptTemplate {
  const examples =
    returnType === "JSON"
      ? jsonStringify(toolsAndContextExamples)
      : yamlStringify(toolsAndContextExamples);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `
You are an efficient and expert assistant, distilling context from the information you have been given.
You are also helping to pick a minimal set of enabled Tools (try to have no overlap in capabilities).
# Current Time:
${new Date().toString()}
# Rules:
- synthesizedContext must not be empty!
- Your response must be valid ${returnType}
# Examples:
${examples}`,
    ),
    HumanMessagePromptTemplate.fromTemplate(`In the provided Schema, what is your best educated guess about appropriate tools and synthesizedContext for this Task?
    ${inputTaskAndGoalString}`),
  ]);

  return promptTemplate;
}
