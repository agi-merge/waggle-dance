import { PromptTemplate } from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

const schema = (format: string) =>
  `
    AutoRefineFeedbackItem
      type: "enhancement" | "error" | "warning"
      reason: string
      replaceIndices: [number, number]
      refinedGoal: string
      suggestedSkills: string[]
      suggestedData: string[]
    AutoRefineFeedback
      feedback: AutoRefineFeedbackItem[]
      combinedRefinedGoal: string

THE ONLY THING YOU MUST OUTPUT IS valid ${format} that matches the psuedo-code representation of AutoRefineFeedback.
`.trim();

type Feedback = {
  type: "enhancement" | "error" | "warning";
  reason: string;
  replaceIndices: [number, number];
  refinedGoal: string;
  suggestedSkills: string[];
  suggestedData: string[];
};

type ExampleFeedback = {
  input: {
    goal: string;
    index: number;
  };
  output: {
    feedbacks: [Feedback];
    combinedRefinedGoal?: string | undefined;
  };
};

export const examplePrompts = [
  "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
  "I need to find the most talked-about books in the self-help genre in 2023. Provide a list of top 10 books along with their brief summaries.",
  "What are the top trending toys for 6-8 year olds on Amazon in April 2023? Provide a list with their prices and customer ratings.",
  "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years?",
  "Provide a list of must-visit places in France, Italy, and Spain, as recommended by top travel bloggers in 2023.",
  "What are the most effective product launches on Hacker News in the last three months? Analyze and provide a summary of each.",
  "I want to understand the sentiment towards electric cars on Reddit. Analyze the last month's posts and comments in the r/ElectricVehicles subreddit.",
  "I'm interested in the most successful Kickstarter campaigns in the Tech category from the last six months. Provide a list with brief descriptions of each campaign and the amount of money raised.",
  "I need to compare the ticket prices for a flight from New York to London on different airlines for the dates December 1-15, 2023.",
  "I want to know the top trending topics on Twitter worldwide right now.",
  "I need to find the best-rated laptops under $1000 on Amazon. Provide a list with their key specifications and customer ratings.",
  "I'm looking for the latest research papers on AI ethics published in 2023. Provide a list with their abstracts.",
  "I want to know the most popular songs on Spotify globally for the week of April 1, 2023.",
  "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
  "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize trends in the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid.",
  "In Next.js 13, write a minimal example of a streaming API HTTP response that uses langchainjs CallbackHandler callbacks.",
];

const exampleObjects: ExampleFeedback[] = [
  {
    input: {
      goal: "I need to find the most talked-about books in the self-help genre in 2023. Provide a list of top 10 books along with their brief summaries.",
      index: 0,
    },
    output: {
      feedbacks: [
        {
          type: "enhancement",
          reason:
            "The goal requires future prediction which is currently not possible.",
          replaceIndices: [0, 103],
          refinedGoal:
            "I need to find the most talked-about books in the self-help genre in 2022. Provide a list of top 10 books along with their brief summaries.",
          suggestedSkills: ["Web Scraping", "Natural Language Processing"],
          suggestedData: ["Goodreads API", "Google Books API"],
        },
      ],
      combinedRefinedGoal:
        "I need to find the most talked-about books in the self-help genre in 2022. Provide a list of top 10 books along with their brief summaries.",
    },
  },
  {
    input: {
      goal: "What are the top trending toys for 6-8 year olds on Amazon in April 2023? Provide a list with their prices and customer ratings.",
      index: 1,
    },
    output: {
      feedbacks: [
        {
          type: "error",
          reason:
            "The goal requires future prediction which is currently not possible.",
          replaceIndices: [0, 108],
          refinedGoal:
            "What are the top trending toys for 6-8 year olds on Amazon in April 2022? Provide a list with their prices and customer ratings.",
          suggestedSkills: ["Web Scraping"],
          suggestedData: ["Amazon Product Advertising API"],
        },
      ],
      combinedRefinedGoal:
        "What are the top trending toys for 6-8 year olds on Amazon in April 2022? Provide a list with their prices and customer ratings.",
    },
  },
  {
    input: {
      goal: "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years?",
      index: 2,
    },
    output: {
      feedbacks: [
        {
          type: "enhancement",
          reason:
            "The goal is broad and could be refined to focus on specific aspects of starting a digital marketing agency.",
          replaceIndices: [0, 130],
          refinedGoal:
            "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years, specifically in the areas of client acquisition and retention?",
          suggestedSkills: ["Market Research"],
          suggestedData: ["Market Reports", "Case Studies"],
        },
      ],
      combinedRefinedGoal:
        "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years, specifically in the areas of client acquisition and retention?",
    },
  },
  {
    input: {
      goal: "I need to find the most talked-about books in the self-help genre in 2023. Provide a list of top 10 books along with their brief summaries.",
      index: 0,
    },
    output: {
      feedbacks: [
        {
          type: "enhancement",
          reason: "The goal can be refined to specify the source of the data.",
          replaceIndices: [0, 103],
          refinedGoal:
            "I need to find the most talked-about books in the self-help genre in 2023 according to Goodreads. Provide a list of top 10 books along with their brief summaries.",
          suggestedSkills: ["Web Scraping", "Natural Language Processing"],
          suggestedData: ["Goodreads API", "Google Books API"],
        },
      ],
      combinedRefinedGoal:
        "I need to find the most talked-about books in the self-help genre in 2023 according to Goodreads. Provide a list of top 10 books along with their brief summaries.",
    },
  },
  {
    input: {
      goal: "What are the top trending toys for 6-8 year olds on Amazon in April 2023? Provide a list with their prices and customer ratings.",
      index: 1,
    },
    output: {
      feedbacks: [
        {
          type: "enhancement",
          reason:
            "The goal can be refined to specify the region as Amazon's trending products can vary by region.",
          replaceIndices: [0, 108],
          refinedGoal:
            "What are the top trending toys for 6-8 year olds on Amazon in the United States in April 2023? Provide a list with their prices and customer ratings.",
          suggestedSkills: ["Web Scraping"],
          suggestedData: ["Amazon Product Advertising API"],
        },
      ],
      combinedRefinedGoal:
        "What are the top trending toys for 6-8 year olds on Amazon in the United States in April 2023? Provide a list with their prices and customer ratings.",
    },
  },
  {
    input: {
      goal: "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years?",
      index: 2,
    },
    output: {
      feedbacks: [
        {
          type: "enhancement",
          reason:
            "The goal is broad and could be refined to focus on specific aspects of starting a digital marketing agency.",
          replaceIndices: [0, 130],
          refinedGoal:
            "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in 2021 and 2022, specifically in the areas of client acquisition and retention?",
          suggestedSkills: ["Market Research"],
          suggestedData: ["Market Reports", "Case Studies"],
        },
      ],
      combinedRefinedGoal:
        "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in 2021 and 2022, specifically in the areas of client acquisition and retention?",
    },
  },
];
const examples = {
  JSON: jsonStringify(exampleObjects),
  YAML: yamlStringify(exampleObjects),
};
export function createRefinePrompt(params: {
  goal: string;
  tools: string;
  returnType: "JSON" | "YAML";
}): PromptTemplate {
  const { goal, tools, returnType } = params;

  const template = `
You are a refining AI agent that is helping to verify the tenacity of the User's GOAL.
User's GOAL: ${goal}
Server TIME: ${new Date().toString()}
TOOLS: ${tools}
SCHEMA: ${schema(returnType)}
EXAMPLES: ${examples[returnType]}
RETURN: ONLY the result of refining the User's GOAL as described in SCHEMA${
    returnType === "JSON" ? ":" : ". Do NOT return JSON:"
  }
`.trim();

  return PromptTemplate.fromTemplate(template);
}
