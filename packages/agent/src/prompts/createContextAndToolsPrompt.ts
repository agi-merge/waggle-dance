// createContextAndToolsPrompt.ts

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

export interface ToolsAndContextPickingInput {
  task: string;
  inServiceOfGoal: string;
  longTermMemories: string;
  availableTools: string[];
}

export interface ToolsAndContextPickingOutput {
  synthesizedContext: string[];
  tools: string[];
}

interface ToolsAndContextExample {
  exampleRemarks: object;
  input: ToolsAndContextPickingInput;
  output: ToolsAndContextPickingOutput;
}

const toolsAndContextExamples: ToolsAndContextExample[] = [
  {
    exampleRemarks: {
      "Self-Awareness":
        "The agent understands HTML, CSS, and JavaScript, which are essential for web scraping.",
      "Input Variables":
        "The URL 'https://silennaihin.com/random/plain.html' is directly included in the context.",
      "Formatting Safety":
        "Special characters in the URL are properly handled.",
      Terse:
        "The agent's lack of long-term memory is not explicitly mentioned to keep the context concise.",
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
        "The stock market has shown significant volatility in the past, with trends influenced by factors such as the COVID-19 pandemic, the Suez Canal blockage, and the Evergrande debt crisis.",
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
      ],
      tools: ["Retrieve Memories", "Bloomberg Terminal", "Google Finance"],
    },
  },

  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the limitations of the agent's knowledge.",
    },
    input: {
      task: "Research AgentGPT",
      inServiceOfGoal:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
      longTermMemories:
        "Previous research on AI technologies like OpenAI's GPT-3, Google's BERT, and Facebook's BART has revealed a wide range of approaches and methodologies, including transformer architectures, reinforcement learning, and unsupervised learning. Also, there were significant advancements in the field of AI with the introduction of transformer-based models like BERT and GPT-3.",
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
    },
    input: {
      task: "Write a Python script to scrape data from a website",
      inServiceOfGoal:
        "Write a Python script to scrape data from https://example.com and store the data in a CSV file.",
      longTermMemories:
        "A similar Python script was written in the past to scrape data from https://anotherexample.com using BeautifulSoup and requests libraries.",
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
      ],
      tools: ["Python", "Google Search", "Stack Overflow", "Write File"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the limitations of the agent's knowledge.",
    },
    input: {
      task: "Research AgentGPT",
      inServiceOfGoal:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
      longTermMemories:
        "Research on similar AI technologies like OpenAI's GPT-3, Google's BERT, and Facebook's BART has revealed a wide range of approaches and methodologies, including transformer architectures, reinforcement learning, and unsupervised learning. Notable projects include Google's BERT, which introduced the concept of bidirectional transformers, and OpenAI's GPT-3, which demonstrated the power of large-scale unsupervised learning.",
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
You are also helping to pick a minimal set of enabled Tools.
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
