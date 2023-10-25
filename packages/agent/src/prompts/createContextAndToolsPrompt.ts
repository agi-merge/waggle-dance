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
        "The synthesized context shows the limitations of the agent's knowledge.",
      toolStrategy:
        "The agent has chosen a set of tools that are well-suited for academic research tasks, demonstrating a good understanding of the tools' capabilities.",
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
      ],
    },
    output: {
      synthesizedContext: {
        knowledgeCutoff:
          "My training data prior to my knowledge cut-off does not contain coherent information about AgentGPT.",
      },
      tools: [
        "Memory Retrieval",
        "Memory Storage",
        "Google Search",
        "Google News",
        "Google Scholar",
        "Google Trends",
        "arXiv",
        "GitHub",
      ],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has chosen a set of tools that are well-suited for programming tasks, demonstrating a good understanding of the tools' capabilities.",
      taskChallenge:
        "The task is complex and requires a good understanding of Python and web scraping techniques. The agent will need to navigate through various resources to find the most effective solution.",
    },
    input: {
      task: "Write a Python script",
      inServiceOfGoal:
        "Write a Python script that scrapes data from a website and stores it in a CSV file.",
      availableTools: [
        "Python Interpreter",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub",
      ],
    },
    output: {
      synthesizedContext: {
        taskUnderstanding:
          "The task requires writing a Python script for web scraping, which involves fetching data from a website and parsing it. The data then needs to be stored in a CSV file.",
        potentialChallenges:
          "Web scraping can be complex due to the variability of website structures. Additionally, some websites may have measures in place to prevent scraping.",
      },
      tools: ["Python Interpreter", "Google Search", "Stack Overflow"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has chosen a set of tools that are well-suited for financial analysis tasks, demonstrating a good understanding of the tools' capabilities.",
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
      ],
    },
    output: {
      synthesizedContext: {
        taskUnderstanding:
          "The task requires analyzing stock market trends over the past 5 years and making predictions about future trends. The findings need to be compiled into a .xlsx report.",
        potentialChallenges:
          "Stock market analysis can be complex due to the volatility of the market and the multitude of factors that can influence trends.",
      },
      tools: [
        "Retrieve Memories",
        "Save Memories",
        "Bloomberg Terminal",
        "Google Finance",
        "Yahoo Finance",
      ],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has chosen a set of tools that are well-suited for design tasks, demonstrating a good understanding of the tools' capabilities.",
      taskChallenge:
        "The task is complex and requires a good understanding of design principles and responsive design techniques. The agent will need to navigate through various resources to find the most effective solution.",
    },
    input: {
      task: "Design a website",
      inServiceOfGoal: "Design a responsive website for a new online store.",
      availableTools: [
        "Figma",
        "Web Browser",
        "Google Search",
        "Stack Overflow",
        "GitHub Search",
      ],
    },
    output: {
      synthesizedContext: {
        taskUnderstanding:
          "The task requires designing a responsive website for a new online store. This involves creating a visually appealing and user-friendly interface that works well on various devices.",
        potentialChallenges:
          "Website design can be complex due to the need for both aesthetic appeal and functionality. Additionally, the website must be responsive, meaning it should work well on various devices and screen sizes.",
      },
      tools: ["Figma", "Stack Overflow", "GitHub Search"],
    },
  },
  {
    exampleRemarks: {
      contextInsight:
        "The synthesized context shows a good understanding of the task requirements and potential challenges.",
      toolStrategy:
        "The agent has chosen a set of tools that are well-suited for translation tasks, demonstrating a good understanding of the tools' capabilities.",
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
      ],
    },
    output: {
      synthesizedContext: {
        taskUnderstanding:
          "The task requires translating a document from English to French. This involves accurately conveying the meaning of the original text in the target language.",
        potentialChallenges:
          "Translation can be complex due to the nuances of language and cultural differences. Additionally, some phrases or idioms may not have direct equivalents in the target language.",
        productSentimentInclusion:
          "The agent has included Product Sentiment Analysis in the list of available tools to provide context as to the quality of each of three other service Tools (DeepL, Google Translate, and Microsoft Translator).",
      },
      tools: [
        "Google Translate",
        "DeepL",
        "Microsoft Translator",
        "Product Sentiment Analysis",
      ],
    },
  },
];

export function createContextAndToolsPrompt({
  namespace,
  returnType,
  inputTaskAndGoalString,
}: {
  namespace: string;
  returnType: "JSON" | "YAML";
  inputTaskAndGoalString: string;
}): PromptTemplate {
  const examples =
    returnType === "JSON"
      ? jsonStringify(toolsAndContextExamples)
      : yamlStringify(toolsAndContextExamples);
  const promptTemplate = PromptTemplate.fromTemplate(
    `[system]
You are an efficient and expert assistant, preparing the context and tool configuration for an ethical LLM Agent to perform a Task for the User.
# Namespace: ${namespace}
# Current Time:
${new Date().toString()}
# Examples:
${examples}
[human]
Provide (in valid ${returnType}) ( tools: string[], context: string | ([key: string]: string)[] ) that would improve the probability of success for the following:
${inputTaskAndGoalString}
`,
  );

  return promptTemplate;
}
