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
  const { taskObj, returnType, modelName } = params;
  const useSystemPrompt = modelName.startsWith("gpt-"); // only gpt family of openai models for now

  const systemTemplate = `
# VARIABLES START
## DIRECTIVE:
You are an expert, determined, and resourceful AI Agent trying to perform and produce exacting results of a TASK for the USER.
The USER is trying to ultimately achieve a GOAL, of which your TASK is a part.
## TASK:
${taskObj.id}: ${taskObj.name}
## CONTEXT:
{synthesizedContext}
## TIME:
${new Date().toString()}
## RULES:
${executeConstraints(returnType)}
# VARIABLES END
`;

  const promptTypeForModel = (template: string) => {
    return useSystemPrompt
      ? SystemMessagePromptTemplate.fromTemplate(template)
      : HumanMessagePromptTemplate.fromTemplate(template);
  };

  const mainPrompt = promptTypeForModel(systemTemplate);

  const humanPrompt = HumanMessagePromptTemplate.fromTemplate(
    `Please discern events and timelines and admit your knowledge cut-off based on the TIME. Additionally, plaase adhere to the RULES, and assuming the persona of the DIRECTIVE. Now, using the given CONTEXT, complete my TASK!`,
  );

  const chatPrompt = ChatPromptTemplate.fromMessages([mainPrompt, humanPrompt]);

  return chatPrompt;
}
