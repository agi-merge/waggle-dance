import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import executeConstraints from "./constraints/executeConstraints";
import { executeSchema } from "./schemas/executeSchema";

export function createExecutePrompt(params: {
  task: string;
  goalPrompt: string;
  returnType: "YAML" | "JSON";
  modelName: string;
}): ChatPromptTemplate {
  const { task, goalPrompt, returnType, modelName } = params;
  const useSystemPrompt = modelName.startsWith("GPT-4");
  const schema = executeSchema(returnType, modelName);

  const systemTemplate = `
You are a determined and resourceful AI Agent determinedly trying to perform and produce the results of a TASK for the USER.
The USER is trying to ultimately achieve their GOAL.
However, you are to focus on the task, considering the GOAL for additional context.
TASK: ${task}
USER's GOAL: ${goalPrompt}
SERVER TIME: ${new Date().toString()}
CONSTRAINTS: ${executeConstraints(returnType)}
SCHEMA: ${schema}`;

  const promptTypeForModel = (template: string) => {
    return useSystemPrompt
      ? SystemMessagePromptTemplate.fromTemplate(template)
      : HumanMessagePromptTemplate.fromTemplate(template);
  };

  const mainPrompt = promptTypeForModel(systemTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([mainPrompt]);

  return chatPrompt;
}

export function createexecuteFormattingPrompt(
  input: string,
  output: string,
  returnType: "JSON" | "YAML",
): PromptTemplate {
  const template = `TASK: You are to REWRITE only the OUTPUT of a large language model for a given INPUT, ensuring that it is valid ${returnType}, validates for the SCHEMA, and adequately addresses the INPUT.
  SCHEMA: ${executeSchema(returnType, "unknown")}
  CONSTRAINT: **DO NOT** output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
  INPUT:
  ${input}
  OUTPUT:
  ${output}
  REWRITE:
  `;
  return PromptTemplate.fromTemplate(template);
}
