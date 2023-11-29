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

interface Feedback {
  type: "enhancement" | "error" | "warning";
  reason: string;
  replaceIndices: [number, number];
  refinedGoal: string;
  suggestedSkills: string[];
  suggestedData: string[];
}

interface ExampleFeedback {
  input: {
    goal: string;
    index: number;
  };
  output: {
    feedbacks: [Feedback];
    combinedRefinedGoal?: string | undefined;
  };
}
interface Prompt {
  title: string;
  prompt: string;
  tags: string[];
}

type ExamplePrompts = Record<string, Prompt[]>;

export const examplePrompts: ExamplePrompts = {
  "📈 Market Research": [
    {
      title: "Solar Energy Comparison",
      prompt:
        "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
      tags: ["Energy", "Solar", "Comparison"],
    },
    {
      title: "Trending Toys",
      prompt:
        "What are the top trending toys for 6-8 year olds on Amazon in April 2023? Provide a list with their prices and customer ratings.",
      tags: ["Toys", "Trends", "Amazon"],
    },
    {
      title: "Best-rated Laptops",
      prompt:
        "I need to find the best-rated laptops under $1000 on Amazon. Provide a list with their key specifications and customer ratings.",
      tags: ["Laptops", "Ratings", "Amazon"],
    },
    {
      title: "Flight Prices Comparison",
      prompt:
        "I need to compare the ticket prices for a flight from New York to London on different airlines for the dates December 1-15, 2023.",
      tags: ["Flights", "Comparison", "Prices"],
    },
    {
      title: "Trending Topics on Twitter",
      prompt:
        "I want to know the top trending topics on Twitter worldwide right now.",
      tags: ["Twitter", "Trending", "Topics"],
    },
  ],
  "📖 Content Analysis": [
    {
      title: "Self-help Books",
      prompt:
        "I need to find the most talked-about books in the self-help genre in 2023. Provide a list of top 10 books along with their brief summaries.",
      tags: ["Books", "Self-help", "Analysis"],
    },
    {
      title: "HackerNews Product Launches",
      prompt:
        "What are the most effective product launches on Hacker News in the last three months? Analyze and provide a summary of each.",
      tags: ["Product Launches", "Hacker News", "Analysis"],
    },
    {
      title: "Electric Vehicle Sentiment Analysis",
      prompt:
        "I want to understand the sentiment towards electric cars on Reddit. Analyze the last month's posts and comments in the r/ElectricVehicles subreddit.",
      tags: ["Sentiment Analysis", "Reddit", "Electric Cars"],
    },
    {
      title: "Successful Kickstarter Campaigns",
      prompt:
        "I'm interested in the most successful Kickstarter campaigns in the Tech category from the last six months. Provide a list with brief descriptions of each campaign and the amount of money raised.",
      tags: ["Kickstarter", "Tech", "Campaigns"],
    },
    {
      title: "Latest Research Papers on AI Ethics",
      prompt:
        "I'm looking for the latest research papers on AI ethics published in 2023. Provide a list with their abstracts.",
      tags: ["AI", "Ethics", "Research Papers"],
    },
  ],
  "🧳 Business Strategy": [
    {
      title: "Digital Marketing Strategies",
      prompt:
        "I am starting a digital marketing agency. What are the key steps and strategies used by successful digital marketing startups in the last two years?",
      tags: ["Digital Marketing", "Strategies", "Startups"],
    },
    {
      title: "Comparison of AI Projects",
      prompt:
        "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://www.waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
      tags: ["AI", "Comparison", "Research"],
    },
  ],
  "🥳 Lifestyle and Entertainment": [
    {
      title: "Must-visit places in Europe",
      prompt:
        "Provide a list of must-visit places in France, Italy, and Spain, as recommended by top travel bloggers in 2023.",
      tags: ["Travel", "Europe", "Bloggers"],
    },
    {
      title: "Popular Songs on Spotify",
      prompt:
        "I want to know the most popular songs on Spotify globally for the week of April 1, 2023.",
      tags: ["Spotify", "Songs", "Trends"],
    },
  ],
  "🏡 Real Estate": [
    {
      title: "Office Real Estate Trends in San Francisco",
      prompt:
        "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid.",
      tags: ["Housing", "Trends", "San Francisco"],
    },
  ],
  "👩‍💻 Engineering": [
    {
      title: "Streaming API HTTP Response in Next.js",
      prompt:
        "In Next.js 13, write a minimal example of a streaming API HTTP response that uses langchainjs CallbackHandler callbacks.",
      tags: ["Next.js", "Streaming API", "Example"],
    },
  ],
};

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
  goalPrompt: string;
  tools: string;
  returnType: "JSON" | "YAML";
}): PromptTemplate {
  const { goalPrompt, tools, returnType } = params;

  const template = `
You are a refining AI agent that is helping to verify the tenacity of the User's GOAL.
User's GOAL: ${goalPrompt}
SERVER TIME: ${new Date().toString()}
TOOLS: ${tools}
SCHEMA: ${schema(returnType)}
EXAMPLES: ${examples[returnType]}
RETURN: ONLY the result of refining the User's GOAL as described in SCHEMA${
    returnType === "JSON" ? ":" : ". Do NOT return JSON:"
  }
`.trim();

  return PromptTemplate.fromTemplate(template);
}
