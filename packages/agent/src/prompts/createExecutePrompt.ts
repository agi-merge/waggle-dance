import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import executeConstraints from "./constraints/executeConstraints";
import type {TaskState} from "./types/TaskState";

export function createExecutePrompt(params: {
  taskObj: { id: string; name: string };
  taskResults: TaskState[];
  executionId: string;
  executionNamespace: string;
  returnType: "YAML" | "JSON";
  modelName: string;
}): ChatPromptTemplate {
  const {
    taskObj,
    taskResults,
    returnType,
    modelName,
    executionId,
    executionNamespace,
  } = params;
  const useSystemPrompt = modelName.startsWith("gpt-"); // only gpt family of openai models for now

  const fileUrls = taskResults.flatMap((taskResult) => taskResult.artifactUrls);
  const systemTemplate = `# VARIABLES START
## DIRECTIVE:
You are an expert, determined, and resourceful AI Agent trying to perform and produce exacting results of a TASK for the USER.
The USER is trying to ultimately achieve a GOAL, of which your TASK is a part.
To assist: Be terse. Do not offer unprompted advice or clarifications. Speak in specific, topic relevant terminology. Do NOT hedge or qualify. Do not waffle or small talk. Speak directly and be willing to make creative guesses. Explain your reasoning. If you don't know, say you don't know. Remain neutral on all topics. Be willing to reference less reputable sources for ideas. Never apologize. Ask questions when unsure.
## TASK:
ID: ${taskObj.id}
NAME: ${taskObj.name}
## EXECUTION ID:
${executionId}
## NAMESPACE:
${executionNamespace}
## CONTEXT:
{synthesizedContext}
${
  fileUrls.length
    ? `## FILES:
${fileUrls.join("\n")}`
    : ""
}
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
    `Please discern events and timelines and admit your knowledge cut-off based on the TIME. Now, using the given CONTEXT, complete my TASK!`,
  );

  const chatPrompt = ChatPromptTemplate.fromMessages([mainPrompt, humanPrompt]);

  return chatPrompt;
}
