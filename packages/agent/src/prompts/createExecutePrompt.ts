import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import executeConstraints from "./constraints/executeConstraints";

export function createExecutePrompt(params: {
  taskObj: { id: string; name: string };
  namespace: string;
  returnType: "YAML" | "JSON";
  modelName: string;
}): ChatPromptTemplate {
  const { taskObj, namespace, returnType, modelName } = params;
  const useSystemPrompt = modelName.startsWith("gpt-"); // only gpt family of openai models for now

  const systemTemplate = `
[variables]
# DIRECTIVE:
You are a determined and resourceful AI Agent determinedly trying to perform and produce exacting results of a TASK for the USER.
The USER is trying to ultimately achieve a GOAL, of which your TASK is a part.
# TASK:
${taskObj.id}, ${taskObj.name}
# CONTEXT:
{synthesizedContext}
${namespace}
# SERVER TIME:
${new Date().toString()}
# RULES:
${executeConstraints(returnType)}
[end variables]
`;

  const promptTypeForModel = (template: string) => {
    return useSystemPrompt
      ? SystemMessagePromptTemplate.fromTemplate(template)
      : HumanMessagePromptTemplate.fromTemplate(template);
  };

  const mainPrompt = promptTypeForModel(systemTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages([mainPrompt]);

  return chatPrompt;
}
