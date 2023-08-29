import { type z } from "zod";

export type AutoRefineFeedbackType =
  | "enhancement"
  | "error"
  | "warning"
  | "pass";

export type AutoRefineFeedback = {
  type: AutoRefineFeedbackType;
  message: string;
  refinedPrompt?: string | undefined | null;
};

export type TypeToZod<T> = {
  [K in keyof T]: T[K] extends string | number | boolean | null | undefined
    ? undefined extends T[K]
      ? z.ZodOptional<z.ZodType<Exclude<T[K], undefined>>>
      : z.ZodType<T[K]>
    : z.ZodObject<TypeToZod<T[K]>>;
};
