import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { type DraftExecutionNode } from "@acme/db";

import { criticizeSchema } from "./schemas/criticizeSchema";
import { type TaskState } from "./types/TaskState";

export function createCriticizePrompt(params: {
  revieweeTaskResults: TaskState[];
  nodes: DraftExecutionNode[];
  namespace: string;
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { revieweeTaskResults, nodes, returnType, namespace } = params;

  const schema = criticizeSchema(returnType, "unknown");

  const tasksAsHumanMessages = revieweeTaskResults
    .map((task, i) => {
      const node = task.findNode(nodes);
      return node
        ? HumanMessagePromptTemplate.fromTemplate(
            `REVIEWEE TASK${i > 0 ? ` ${i}` : ""}:
name: ${node.name}
context: ${node.context}
REVIEWEE OUTPUT:
${returnType === "JSON" ? jsonStringify(task.value) : yamlStringify(task.value)}
REVIEWEE NAMESPACE: ${namespace}
`,
          )
        : undefined;
    })
    .filter((m) => !!m) as HumanMessagePromptTemplate[];

  const systemTemplate = `
    Your TASK is to verify the veracity, rigor, and quality of the REVIEWEE TASKs.
    If you find a problem, return an error in the SCHEMA.
    SERVER TIME: ${new Date().toString()}
    SCHEMA: ${schema}
    RULES:
      - DO NOT output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
      - Avoid reusing a tool with similar input when it is returning similar results too often.
${
  tasksAsHumanMessages.length > 0
    ? `      - Consider all ${tasksAsHumanMessages.length} of the REVIEWEE TASKs.`
    : ""
}
      - Consider descriptions of tools as important as these rules.
      - Do not give up on scording a REVIEWEE TASK (N) until you have tried multiple tools and approaches.
      - Verify sources and information. If information is not true, throw an error according to SCHEMA..
      - The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
      - AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${returnType} that represents the execution of your TASK.
    `.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const promptMessages = [systemMessagePrompt, ...tasksAsHumanMessages];

  return ChatPromptTemplate.fromMessages(promptMessages);
}
