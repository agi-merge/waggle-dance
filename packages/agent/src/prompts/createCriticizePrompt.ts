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

  const systemTemplate = `
SERVER TIME: ${new Date().toString()}
SCHEMA: ${schema}
RETURN: ONLY a single AgentPacket with the results of your TASK in SCHEMA
TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK using the SCHEMA.
CONSTRAINTS:
  - DO NOT output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
  - If the REVIEWEE OUTPUT is not sufficiently complete, RETURN an AgentPacket of type "error" or "requestHumanInput".
  - Avoid reusing a tool with similar input when it is returning similar results too often.
REVIEWEE MEMORY NAMESPACE: ${namespace}
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const tasksAsHumanMessages = revieweeTaskResults
    .map((task, i) => {
      const node = task.node(nodes);
      return node
        ? HumanMessagePromptTemplate.fromTemplate(
            `REVIEWEE TASK${i > 0 ? ` ${i}` : ""}:
name: ${node.name}
context: ${node.context}
REVIEWEE OUTPUT:
${
  returnType === "JSON"
    ? jsonStringify(task.packets)
    : yamlStringify(task.packets)
}`,
          )
        : undefined;
    })
    .filter((m) => !!m) as HumanMessagePromptTemplate[];

  const promptMessages = [systemMessagePrompt, ...tasksAsHumanMessages];

  return ChatPromptTemplate.fromPromptMessages(promptMessages);
}
