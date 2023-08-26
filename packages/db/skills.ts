import { type Skillset } from ".";

export type SkillsetCreate = Omit<Skillset, "index" | "id">;
export type NullableSkillset = Skillset | undefined | null;

const skillsData: SkillsetCreate[] = [
  {
    label: "🏃‍♀️ Context Baton",
    isRecommended: true,
    description: "Parent → Child context passing",
    // risk: "low",
  },
  {
    label: "💭 Memory",
    isRecommended: true,
    description: "Entities, agent internal scratch pad, vector database",
    // risk: "low",
  },
  {
    label: "🗄️ Database",
    isRecommended: true,
    description: "Query databases",
    // risk: "medium",
  },
  {
    label: "✉️ Email",
    isRecommended: false,
    description: "Send emails, react to emails",
    // risk: "high",
  },
  {
    label: "🪝 Webhook",
    isRecommended: false,
    description: "React to webhooks",
    // risk: "low",
  },
  {
    label: "🖥️ REST API",
    isRecommended: false,
    description: "Make HTTP requests",
    // risk: "high",
  },
  {
    label: "🍴 Git",
    isRecommended: false,
    description: "Push, pull, open pull requests, manage CI, etc.",
    // risk: "high",
  },
  {
    label: "🌐 Browser",
    isRecommended: true,
    description:
      "Use a headless browser to view, scrape, or interact with websites",
    // risk: "medium",
  },
  {
    label: "Files",
    description: "Read, write, and watch files",
    isRecommended: false,
    // risk: "low",
  },
];

export const skillDatabase: Skillset[] = skillsData.map((skill, index) => ({
  ...skill,
  id: `${index}`,
  index,
}));
