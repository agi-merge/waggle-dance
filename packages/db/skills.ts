// FIXME: merge w/ DynamicZodSkill / skills / use the database
import { z } from "zod";

import type { Skillset } from ".";

export type SkillsetCreate = Omit<Skillset, "index" | "id"> & {
  schema: z.ZodObject<z.ZodRawShape>;
};
export type NullableSkillset = Skillset | undefined | null;

const skillsData: SkillsetCreate[] = [
  {
    label: "Help Notifications",
    isRecommended: true,
    description:
      "Receive notifications when the AI needs clarification or help with something like account access, or if an error has occurred.",
    schema: z.object({}),
  },
  {
    label: "🏃‍♀️ Context Baton",
    isRecommended: true,
    description: "Parent → Child context passing",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "💭 Memory",
    isRecommended: true,
    description: "Entities, agent internal scratch pad, vector database",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "🗄️ Database",
    isRecommended: false,
    description: "Query databases",
    schema: z.object({}),
    // risk: "medium",
  },
  {
    label: "✉️ Email",
    isRecommended: false,
    description: "Send emails, react to emails",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🪝 Webhook",
    isRecommended: false,
    description: "React to webhooks",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "🖥️ REST API",
    isRecommended: false,
    description: "Make HTTP requests",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🍴 Git",
    isRecommended: false,
    description: "Push, pull, open pull requests, manage CI, etc.",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🌐 Browser",
    isRecommended: true,
    description:
      "Use a headless browser to view, scrape, or interact with websites",
    schema: z.object({}),
    // risk: "medium",
  },
  {
    label: "Files",
    description: "Read, write, and watch files",
    schema: z.object({}),
    isRecommended: false,
    // risk: "low",
  },
  {
    label: "Wolfram|Alpha",
    isRecommended: true,
    description: "Query Wolfram|Alpha",
    schema: z.object({}),
  },
  {
    label: "Google Search",
    isRecommended: true,
    description:
      "Scrapes real time Google results. Try to avoid SEO spam and treat results with skepticism.",
    schema: z.object({}),
  },
  {
    label: "Google Trends",
    isRecommended: true,
    description: "Scrapes real time Google Trends results.",
    schema: z.object({}),
  },
  {
    label: "Google Scholar",
    isRecommended: true,
    description:
      "Scrapes real time results. Google Scholar API lets users search for academic content like articles, theses, and books from various sources. It ranks these items based on their text, author, where they're published, and how often they're cited. This helps users find relevant research quickly.",
    schema: z.object({}),
  },
  {
    label: "Google News",
    isRecommended: true,
    description:
      "Scrapes real-time results. Google News API offers an automated news aggregation service. It collects headlines from various sources globally, categorizes similar articles and presents them based on each user's interests. The API provides access to multiple links for each news story, allowing users to choose their topic of interest and select from different publishers' versions of the story. The selection and ranking of articles are performed by algorithms that assess factors such as the frequency and location of online appearance. It also prioritizes attributes like timeliness, relevance, diversity, and location. The system is impartial, enabling access to a wide range of perspectives for any story. Google is continuously improving News by adding new sources and enhancing its technology, extending its reach to more regions worldwide.",
    schema: z.object({}),
  },
  {
    label: "YouTube",
    isRecommended: true,
    description:
      "YouTube Search API scrapes real-time search results. It parses ads, videos, shorts, search suggestions, channels, playlists, and more. It supports infinite scrolling and all the native YouTube filters.",
    schema: z.object({}),
  },
  {
    label: "Amazon Search",
    isRecommended: true,
    description:
      "Scrapes real-time Amazon search results. The Amazon Search API lets developers tap into Amazon's huge product database. You can search for items, get sorted results based on relevance or reviews, and pull product details.",
    schema: z.object({}),
  },
];

export const skillDatabase: Skillset[] = skillsData.map((skill, index) => ({
  ...skill,
  id: `${index}`,
  index,
}));
