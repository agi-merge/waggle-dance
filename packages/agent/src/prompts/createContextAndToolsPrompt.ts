// createContextAndToolsPrompt.ts

import { PromptTemplate } from "langchain/prompts";
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
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has judiciously chosen a subset of tools that are most relevant for translation tasks, demonstrating a good understanding of the tools' capabilities and avoiding unnecessary tool usage.",
      taskChallenge:
        "The task is complex and requires a good understanding of both English and French, as well as the nuances of translation. The agent will need to navigate through various resources to find the most effective solution.",
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
      synthesizedContext: {
        taskDetails:
          "The task involves translating a document from English to French, a process that requires a deep understanding of both languages and the ability to convey the original meaning accurately.",
        culturalNuances:
          "In translation, it's important to consider cultural nuances. Some English phrases or idioms may not have direct equivalents in French and will require creative interpretation.",
        translationApproach:
          "A two-step translation process can be effective: first, translate the text literally, then refine the translation by adjusting for idioms, cultural references, and tone.",
      },
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
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has judiciously chosen a subset of tools that are most relevant for programming tasks, demonstrating a good understanding of the tools' capabilities and avoiding unnecessary tool usage.",
      taskChallenge:
        "The task is complex and requires a good understanding of Python and web scraping techniques. The agent will need to navigate through various resources to find the most effective solution.",
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
      synthesizedContext: {
        taskScope:
          "The task involves writing a Python script for web scraping, which entails fetching and parsing data from a website, and storing it in a CSV file.",
        websiteVariability:
          "Websites can have vastly different structures, making web scraping a complex task. Some websites may also have measures to prevent scraping.",
        dataManagement:
          "After scraping, the data needs to be cleaned and structured properly for further analysis or storage in a CSV file.",
      },
      tools: ["Python Interpreter", "Google Search", "Stack Overflow"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has judiciously chosen a subset of tools that are most relevant for design tasks, demonstrating a good understanding of the tools' capabilities and avoiding unnecessary tool usage.",
      taskChallenge:
        "The task is complex and requires a good understanding of design principles and responsive design techniques. The agent will need to navigate through various resources to find the most effective solution.",
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
      synthesizedContext: {
        taskObjective:
          "The task involves designing a responsive website header for a new online store, which requires a visually appealing and user-friendly interface that works well on various devices.",
        designPrinciples:
          "Good design balances aesthetic appeal with functionality. The header, as the first point of interaction for users, should guide them intuitively to the most important parts of the online store.",
        responsiveDesign:
          "A mobile-first approach ensures the design works well on smaller screens. Additional features and layout changes for larger screens can be added using CSS media queries.",
      },
      tools: ["Figma", "Stack Overflow"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has judiciously chosen a subset of tools that are most relevant for financial analysis tasks, demonstrating a good understanding of the tools' capabilities and avoiding unnecessary tool usage.",
      taskChallenge:
        "The task is complex and requires a good understanding of financial markets and analysis techniques. The agent will need to navigate through various resources to find the most effective solution.",
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
      synthesizedContext: {
        taskRequirements:
          "The task involves analyzing stock market trends over the past 5 years and making predictions about future trends. The findings need to be compiled into a .xlsx report.",
        marketVolatility:
          "The stock market is inherently volatile, with many factors influencing trends. This makes analysis a complex task.",
        predictiveModeling:
          "Predicting future trends involves analyzing historical data and considering factors like economic indicators, company performance, and market news. A combination of fundamental and technical analysis can be effective.",
      },
      tools: ["Retrieve Memories", "Bloomberg Terminal", "Google Finance"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows the limitations of the agent's knowledge.",
      toolStrategy:
        "The agent has judiciously chosen a subset of tools that are most relevant for academic research tasks, demonstrating a good understanding of the tools' capabilities and avoiding unnecessary tool usage.",
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
      synthesizedContext: {
        knowledgeCutoff:
          "My training data prior to my knowledge cut-off does not contain coherent information about AgentGPT.",
      },
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
}): PromptTemplate {
  const examples =
    returnType === "JSON"
      ? jsonStringify(toolsAndContextExamples)
      : yamlStringify(toolsAndContextExamples);
  const promptTemplate = PromptTemplate.fromTemplate(
    `[system]
You are an efficient and expert assistant, distilling context from the information you have been given.
You are also helping to pick a minimal set of enabled Tools (try to have no overlap in capabilities).
# Current Time:
${new Date().toString()}
# Schema:
(
  tools: string[]
  synthesizedContext: ([key: string]: string))[]
)
synthesizedContext must not be empty!
convert to valid ${returnType}
# Examples:
${examples}
[human]
In the provided Schema, what is your best educated guess about appropriate tools and synthesizedContext for this Task?
${inputTaskAndGoalString}
`,
  );

  return promptTemplate;
}
