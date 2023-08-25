import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

import { logger } from "./loggerMiddleware";

export type SkillDisplay = {
  id: string;
  label: string;
  description: string;
  risk: "low" | "medium" | "high";
  toolkit?: Omit<SkillDisplay, "toolkit">[] | null | undefined;
  isRecommended?: boolean;
  index: number;
};

export type SkillData = Pick<
  SkillDisplay,
  "label" | "description" | "isRecommended" | "risk"
>;
export type NullableSkillDisplay = SkillDisplay | undefined | null;

const skillsData: SkillData[] = [
  {
    label: "🏃‍♀️ Context Baton",
    isRecommended: true,
    description: "Parent → Child context passing",
    risk: "low",
  },
  {
    label: "💭 Memory",
    isRecommended: true,
    description: "Entities, agent internal scratch pad, vector database",
    risk: "low",
  },
  {
    label: "🗄️ Database",
    isRecommended: true,
    description: "Query databases",
    risk: "medium",
  },
  {
    label: "✉️ Email",
    description: "Send emails, react to emails",
    risk: "high",
  },
  {
    label: "🪝 Webhook",
    description: "React to webhooks",
    risk: "low",
  },
  {
    label: "🖥️ REST API",
    description: "Make HTTP requests",
    risk: "high",
  },
  {
    label: "🍴 Git",
    description: "Push, pull, open pull requests, manage CI, etc.",
    risk: "high",
  },
  {
    label: "🌐 Browser",
    isRecommended: true,
    description:
      "Use a headless browser to view, scrape, or interact with websites",
    risk: "medium",
  },
  {
    label: "Files",
    description: "Read, write, and watch files",
    risk: "low",
  },
];

export const skillDatabase: SkillDisplay[] = skillsData.map((skill, index) => ({
  ...skill,
  id: uuidv4(),
  index,
}));

// a version that keeps the nulls in between indices
const defaultSkills = skillDatabase.map((skill) => {
  if (skill.isRecommended) {
    return skill;
  }
  return null;
});

interface SkillStore {
  selectedSkills: NullableSkillDisplay[];
  toggleSkill: (skill: SkillDisplay) => void;
  setSkills: (skills: NullableSkillDisplay[]) => void;
  selectOnlyRecommended: () => void;
  selectAll: () => void;
  deselectAll: () => void;
}

const useSkillStore = create<SkillStore>()(
  logger(
    (set) => ({
      selectedSkills: [...defaultSkills],
      toggleSkill: (skill: SkillDisplay) =>
        set((state) => {
          const isSkillSelected = state.selectedSkills
            .map((s) => s?.id)
            .includes(skill?.id);
          const newValues = [...state.selectedSkills];
          newValues[skill.index] = isSkillSelected ? null : skill;
          return { selectedSkills: newValues };
        }),
      setSkills: (skills: NullableSkillDisplay[]) => {
        set({ selectedSkills: skills });
      },
      selectOnlyRecommended: () => {
        set({
          selectedSkills: [...defaultSkills],
        });
      },
      selectAll: () => {
        set({
          selectedSkills: [...skillDatabase],
        });
      },
      deselectAll: () => {
        set({ selectedSkills: Array(skillDatabase.length).map(() => null) });
      },
    }),

    "skill-store",
  ),
);

export default useSkillStore;
