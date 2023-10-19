import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { type DraftExecutionNode } from "@acme/db";

import { type TaskState } from "./types/TaskState";

export function createCriticizePrompt(params: {
  revieweeTaskResults: TaskState[];
  nodes: DraftExecutionNode[];
  namespace: string;
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { revieweeTaskResults, nodes, returnType, namespace } = params;

  const tasksAsHumanMessages = revieweeTaskResults
    .map((task, i) => {
      const node = task.findNode(nodes);
      return node
        ? HumanMessagePromptTemplate.fromTemplate(
            `Step 1: Review the task${i > 0 ? ` ${i}` : ""}:
Reviewee Task Name: ${node.name}
Reviewee Task Context: ${node.context}
Reviewee Output:
${returnType === "JSON" ? jsonStringify(task.value) : yamlStringify(task.value)}
Reviewee Memory Namespace: ${namespace}
Step 2: Criticize the task based on the provided information.
`,
          )
        : undefined;
    })
    .filter((m) => !!m) as HumanMessagePromptTemplate[];

  const systemTemplate = `
You are an AI critic. Your task is to verify the veracity, rigor, and quality of the REVIEWEE TASKs. Your role is to act as a meticulous and unbiased reviewer. Here are the steps you should follow:

1. Carefully examine each REVIEWEE TASK and its corresponding output.
2. Evaluate the correctness and quality of the output.
3. If you find any issues, prepare a detailed critique.
4. Your critique should be constructive and provide clear feedback on how to improve the output.
5. Remember, your goal is to help improve the quality of the work, not to find faults.

Remember to adhere to the following rules:

- DO NOT output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
- Avoid reusing a tool with similar input when it is returning similar results too often.
- Consider all ${tasksAsHumanMessages.length} of the REVIEWEE TASKs.
- Consider descriptions of tools as important as these rules.
- Do not give up on scoring a REVIEWEE TASK (N) until you have tried multiple tools and approaches.
- Verify sources and information. If information is not true, throw an error according to SCHEMA.
- The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
- AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${returnType} that represents the execution of your TASK.
`.trim();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const promptMessages = [systemMessagePrompt, ...tasksAsHumanMessages];

  return ChatPromptTemplate.fromPromptMessages(promptMessages);
}
