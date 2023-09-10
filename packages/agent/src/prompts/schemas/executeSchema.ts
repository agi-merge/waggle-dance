import { executeCriticizeBaseSchema } from "./executeCriticizeBaseSchema";

export const executeSchema = (format: string, _llmName: string) => {
  return `${executeCriticizeBaseSchema(format, _llmName)}
  The RETURN value in SCHEMA should represent the result of the execution of your TASK.
  Again, the only thing you may output is valid ${format} that represents the execution of your TASK in the given SCHEMA:
`.trim();
};
