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
  goalPrompt: string;
  nodes: DraftExecutionNode[];
  namespace: string;
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { revieweeTaskResults, nodes, returnType, namespace, goalPrompt } =
    params;

  const schema = criticizeSchema(returnType, "unknown");

  const tasksAsHumanMessages = revieweeTaskResults
    .map((task, i) => {
      const node = task.findNode(nodes);
      return node
        ? HumanMessagePromptTemplate.fromTemplate(
            `# START REVIEWEE TASK ${i > 0 ? ` ${i}` : ""}
## TASK:
${node.name}
## ID:
${node.id}
## NAMESPACE:
${namespace}
## OUTPUT:
${returnType === "JSON" ? jsonStringify(task.value) : yamlStringify(task.value)}
# END REVIEWEE TASK ${i > 0 ? ` ${i}` : ""}
`,
          )
        : undefined;
    })
    .filter((m) => !!m) as HumanMessagePromptTemplate[];

  const systemTemplate =
    `You are an experienced, helpful, knowledgeable, yet critical executive assistant and project manager.
You to verify the veracity, rigor, and quality of your colleague's work henceforth known as REVIEWEE TASK${
      tasksAsHumanMessages.length > 0 ? "s" : ""
    }.
When taken as a whole ${
      tasksAsHumanMessages.length > 0 ? "s" : ""
    }, the REVIEWEE TASK${
      tasksAsHumanMessages.length > 0 ? "s" : ""
    } should advance towards the EVENTUAL GOAL.
If you find a problem, return an error in the SCHEMA.
EVENTUAL GOAL:
${goalPrompt}
SCHEMA: ${schema}
TIME: ${new Date().toString()}
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
