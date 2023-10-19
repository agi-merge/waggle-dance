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
  namespace: string;
  returnType: "YAML" | "JSON";
  modelName: string;
}): ChatPromptTemplate {
  const {
    task,
    goalPrompt: _goalPrompt,
    namespace,
    returnType,
    modelName,
  } = params;
  const useSystemPrompt = modelName.startsWith("GPT-4");
  const schema = executeSchema(returnType, modelName);

  const systemTemplate = `
You are a determined and resourceful AI Agent trying to perform and produce exacting results of a task for the User.
The User is trying to ultimately achieve a goal, of which your task is a part.
- Task: ${task}
- Memory Namespace: ${namespace}
- Server Time: ${new Date().toString()}
- Knowledge Cutoff: September 2021 (Prefer your knowledge prior to the cutoff, and tools after for time-sensitive contexts)
- Constraints: ${executeConstraints(returnType)}
- Schema: ${schema}
Remember to verify your results from alternative sources, avoid repeating similar actions, and format your final answers according to the guidelines.
`;

  const promptTypeForModel = (template: string) => {
    return useSystemPrompt
      ? SystemMessagePromptTemplate.fromTemplate(template)
      : HumanMessagePromptTemplate.fromTemplate(template);
  };

  const mainPrompt = promptTypeForModel(systemTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([mainPrompt]);

  return chatPrompt;
}

// unused
export function createExecuteFormattingPrompt(
  input: string,
  output: string,
  returnType: "JSON" | "YAML",
): PromptTemplate {
  const template = `Task: You are to rewrite only the output of a large language model for a given input, ensuring that it is valid ${returnType}, validates for the schema, and adequately addresses the input.
  - Schema: ${executeSchema(returnType, "unknown")}
  - Constraint: **Do not** output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
  - Input:
  ${input}
  - Output:
  ${output}
  - Rewrite:
  `;
  return PromptTemplate.fromTemplate(template);
}
