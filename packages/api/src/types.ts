import type {z} from "zod";

export type AutoRefineFeedbackType = "enhancement" | "error" | "warning";

export interface AutoRefineFeedbackItem {
  type: AutoRefineFeedbackType;
  reason: string;
  replaceIndices: [number, number];
  refinedGoal: string;
  suggestedSkills: string[];
  suggestedData: string[];
}

export interface AutoRefineFeedback {
  feedback: AutoRefineFeedbackItem[];
  combinedRefinedGoal: string;
}

export type TypeToZod<T> = {
  [K in keyof T]: T[K] extends string | number | boolean | null | undefined
    ? undefined extends T[K]
      ? z.ZodOptional<z.ZodType<Exclude<T[K], undefined>>>
      : z.ZodType<T[K]>
    : z.ZodObject<TypeToZod<T[K]>>;
};
