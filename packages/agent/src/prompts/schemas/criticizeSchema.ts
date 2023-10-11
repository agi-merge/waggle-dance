import executeCriticizeBaseSchema from "./executeCriticizeBaseSchema";

export const criticizeSchema = (format: string, _llmName: string) => {
  return `${executeCriticizeBaseSchema(format, _llmName)}`.trim();
};
