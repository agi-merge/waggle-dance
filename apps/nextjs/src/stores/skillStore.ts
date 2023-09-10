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
  selectedSkillsLength: number;
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
      selectedSkillsLength: defaultSkills.length,
      toggleSkill: (skill: Skillset) =>
        set((state) => {
          const isSkillSelected = state.selectedSkills
            .map((s) => s?.id)
            .includes(skill?.id);
          const newValues = [...state.selectedSkills];
          newValues[skill.index] = isSkillSelected ? null : skill;
          return {
            selectedSkills: newValues,
            selectedSkillsLength: newValues.filter(Boolean).length,
          };
        }),
      setSkills: (skills: NullableSkillset[]) => {
        set({
          selectedSkills: skills,
          selectedSkillsLength: skills.filter(Boolean).length,
        });
      },
      selectOnlyRecommended: () => {
        set({
          selectedSkills: [...defaultSkills],
          selectedSkillsLength: defaultSkills.filter(Boolean).length,
        });
      },
      selectAll: () => {
        set({
          selectedSkills: [...skillDatabase],
          selectedSkillsLength: skillDatabase.length,
        });
      },
      deselectAll: () => {
        set({
          selectedSkills: Array(skillDatabase.length).map(() => null),
          selectedSkillsLength: 0,
        });
      },
    }),

    "skill-store",
  ),
);

export default useSkillStore;
