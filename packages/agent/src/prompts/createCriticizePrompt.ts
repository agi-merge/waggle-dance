import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { criticizeSchema } from "./schemas/criticizeSchema";
import { type DAGNode } from "./types/DAGNode";
import { type TaskState } from "./types/TaskState";

export function createCriticizePrompt(params: {
  revieweeTaskResults: TaskState[];
  nodes: DAGNode[];
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { revieweeTaskResults, nodes, returnType } = params;

  const schema = criticizeSchema(returnType, "unknown");

  const systemTemplate = `
SERVER TIME: ${new Date().toString()}
SCHEMA: ${schema}
RETURN: ONLY a single AgentPacket with the results of your TASK in SCHEMA
TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK using the SCHEMA.
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const tasksAsHumanMessages = Object.entries(revieweeTaskResults)
    .map((task, i) => {
      const node = task[1].node(nodes);
      return node
        ? HumanMessagePromptTemplate.fromTemplate(
            `REVIEWEE TASK${i > 0 ? ` ${i}` : ""}:
name: ${node.name}
context: ${node.context}
REVIEWEE OUTPUT:
${
  returnType === "JSON"
    ? jsonStringify(task[1].packets)
    : yamlStringify(task[1].packets)
}`,
          )
        : undefined;
    })
    .filter((m) => !!m) as HumanMessagePromptTemplate[];

  const promptMessages = [systemMessagePrompt, ...tasksAsHumanMessages];

  return ChatPromptTemplate.fromPromptMessages(promptMessages);
}
