// executeAndCriticizePrompt.ts
import { SystemMessagePromptTemplate } from "langchain/prompts";

// Helper function to generate the base schema
function executeBaseSchema(format: string, _llmName: string) {
  return `
Psuedo-Typescript schema to be translated into ${format}:
type ChainPacket =
| type: "done"; value: string // result of TASK
| type: "error"; severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; reason: string
example
p:
  - type: "xyz"
  … others

When outputting URLs, ensure that they do not HTTP 4xx+ using a Web Browser Tool.
`.trim();
}

// Helper function to generate the execute schema
function executeSchema(format: string, _llmName: string) {
  return `${executeBaseSchema(format, _llmName)}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK:
`.trim();
}

// Helper function to generate the criticize schema
function criticizeSchema(format: string, _llmName: string) {
  return `${executeBaseSchema(format, _llmName)}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
For example, if the task is repeating, loops, or has a low score, the result would be to return an error ChainPacket with suggestions to improve.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK:
`.trim();
}

export function createExecutePrompt(params: {
  task: string;
  returnType: string;
}): SystemMessagePromptTemplate {
  const { task, returnType } = params;

  const schema = executeSchema(returnType, "unknown");

  const template = `
  Execute TASK: ${task}
  Server TIME: ${new Date().toString()}
  SCHEMA: ${schema}
  `.trim();

  const promptTemplate = SystemMessagePromptTemplate.fromTemplate(template);
  return promptTemplate;
}

export function createCriticizePrompt(params: {
  task: string;
  result: string;
  returnType: string;
}): SystemMessagePromptTemplate {
  const { task, result, returnType } = params;

  const schema = criticizeSchema("YAML", "unknown");

  const template =
    `You are a reviewing agent that output their review in ${returnType} format.
      Your TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK. Calculate a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated IQ (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
      REVIEWEE TASK: ${task}
      REVIEWEE OUTPUT: ${result}
      Server TIME: ${new Date().toString()}
      SCHEMA: ${schema}
      RETURN: ONLY a single ChainPacket with the result of Your TASK in SCHEMA${
        returnType === "JSON" ? ":" : ". Do NOT return JSON:"
      }
      `.trim();

  const promptTemplate = SystemMessagePromptTemplate.fromTemplate(template);
  return promptTemplate;
}
