import { create } from "zustand";

import { type Skillset } from "@acme/db";
import { skillDatabase, type NullableSkillset } from "@acme/db/skills";

import { logger } from "./loggerMiddleware";

// a version that keeps the nulls in between indices
const defaultSkills = skillDatabase.map((skill) => {
  if (skill.isRecommended) {
    return skill;
  }
  return null;
});

interface SkillStore {
  selectedSkills: NullableSkillset[];
  toggleSkill: (skill: Skillset) => void;
  setSkills: (skills: NullableSkillset[]) => void;
  selectOnlyRecommended: () => void;
  selectAll: () => void;
  deselectAll: () => void;
}

const useSkillStore = create<SkillStore>()(
  logger(
    (set) => ({
      selectedSkills: [...defaultSkills],
      toggleSkill: (skill: Skillset) =>
        set((state) => {
          const isSkillSelected = state.selectedSkills
            .map((s) => s?.id)
            .includes(skill?.id);
          const newValues = [...state.selectedSkills];
          newValues[skill.index] = isSkillSelected ? null : skill;
          return { selectedSkills: newValues };
        }),
      setSkills: (skills: NullableSkillset[]) => {
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
