import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
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
Execute TASK: ${task}
Server TIME: ${new Date().toString()}
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
