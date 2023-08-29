export type AutoRefineFeedbackType =
  | "enhancement"
  | "error"
  | "warning"
  | "pass";

export type AutoRefineFeedback = {
  type: AutoRefineFeedbackType;
  message: string;
  refinedPrompt: string;
};
