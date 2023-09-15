import { z } from "zod";

import { type Skillset } from ".";

export type SkillsetCreate = Omit<Skillset, "index" | "id"> & {
  schema: z.ZodObject<z.ZodRawShape>;
};
export type NullableSkillset = Skillset | undefined | null;

const skillsData: SkillsetCreate[] = [
  {
    label: "Notify Human for Help",
    isRecommended: true,
    description:
      "Receive notifications when the AI needs clarification or help with something like account access, or an error has occurred.",
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
    isRecommended: true,
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
];

export const skillDatabase: Skillset[] = skillsData.map((skill, index) => ({
  ...skill,
  id: `${index}`,
  index,
}));
