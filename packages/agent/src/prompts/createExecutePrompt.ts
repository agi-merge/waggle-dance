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
  returnType: "YAML" | "JSON";
  modelName: string;
}): ChatPromptTemplate {
  const { task, returnType, modelName } = params;
  const useSystemPrompt = modelName.startsWith("GPT-4");
  const schema = executeSchema(returnType, "unknown");

  const systemTemplate = `
You are a determined and resourceful AI Agent desperately trying to execute your TASK
TASK: ${task}
SERVER TIME: ${new Date().toString()}
CONSTRAINTS: ${executeConstraints(returnType)}
SCHEMA: ${schema}`;

  const promptTypeForModel = (template: string) => {
    return useSystemPrompt
      ? SystemMessagePromptTemplate.fromTemplate(template)
      : HumanMessagePromptTemplate.fromTemplate(systemTemplate);
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
