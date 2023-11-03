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
  availableTools: string[];
};

export type ToolsAndContextPickingOutput = {
  synthesizedContext: object;
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
    },
    input: {
      task: "Access and extract text from https://silennaihin.com/random/plain.html",
      inServiceOfGoal:
        "Open https://silennaihin.com/random/plain.html and paste all of the text on the page in a .txt file",
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
      contextInsight:
        "The synthesized context captures the intricacies of translation, emphasizing the importance of understanding both languages and cultural nuances.",
      toolStrategy:
        "The agent smartly selects translation tools known for their accuracy and also includes a tool for sentiment analysis, which can be crucial in maintaining the tone of the original text.",
    },
    input: {
      task: "Translate a document",
      inServiceOfGoal: "Translate a document from English to French.",
      availableTools: [
        "Google Translate",
        "DeepL",
        "Microsoft Translator",
        "Web Browser",
        "Google Search",
        "Product Sentiment Analysis",
        "Language Dictionaries",
        "Translation Tools",
      ],
    },
    output: {
      synthesizedContext: [
        "The task involves translating a document from English to French, a process that requires a deep understanding of both languages and the ability to convey the original meaning accurately.",
        "In translation, it's important to consider cultural nuances. Some English phrases or idioms may not have direct equivalents in French and will require creative interpretation.",
      ],
      tools: [
        "Google Translate",
        "DeepL",
        "Microsoft Translator",
        "Product Sentiment Analysis",
      ],
    },
  },
  {
    exampleRemarks: {
      contextAnalysis:
        "The context insightfully outlines the complexities of web scraping, from dealing with diverse website structures to handling anti-scraping measures.",
      taskComplexity:
        "The context acknowledges the complexity of the task, emphasizing the need for data cleaning and structuring post-scraping.",
    },
    input: {
      task: "Write a scraper in Python",
      inServiceOfGoal:
        "Write a Python script that scrapes data from a website and stores it in a CSV file.",
      availableTools: [
        "Python Interpreter",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub",
        "Python Libraries",
        "Web Scraping Tools",
        "CSV Libraries",
      ],
    },
    output: {
      synthesizedContext: [
        "The task involves writing a Python script for web scraping, which entails fetching and parsing data from a website, and storing it in a CSV file.",
        "Websites can have vastly different structures, making web scraping a complex task. Some websites may also have measures to prevent scraping.",
      ],
      tools: ["Python Interpreter", "Google Search", "Stack Overflow"],
    },
  },
  {
    exampleRemarks: {
      contextCreativity:
        "The context insightfully balances the need for aesthetic appeal and functionality in design, and advocates for a mobile-first approach.",
    },
    input: {
      task: "Design a website header",
      inServiceOfGoal: "Design a responsive header for a new online store.",
      availableTools: [
        "Figma",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub Search",
        "Design Libraries",
        "Responsive Design Tools",
        "Color Palette Tools",
      ],
    },
    output: {
      synthesizedContext: [
        "The task involves designing a responsive website header for a new online store, which requires a visually appealing and user-friendly interface that works well on various devices.",
      ],
      tools: ["Figma", "Stack Overflow"],
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
      taskChallenge:
        "The task is complex and requires a deep understanding of AI technologies. The agent will need to navigate a vast amount of information and distill it into a concise and informative report.",
    },
    input: {
      task: "Research AgentGPT",
      inServiceOfGoal:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
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
You are also helping to pick a minimal set of enabled Tools (try to have no overlap in capabilities).
# Current Time:
${new Date().toString()}
# Schema:
(
  tools: string[]
  synthesizedContext: ([key: string]: string))[]
)
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
