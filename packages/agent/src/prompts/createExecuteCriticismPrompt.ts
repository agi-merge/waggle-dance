import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

// Helper function to generate the base schema
function executeBaseSchema(_format: string, _llmName: string) {
  return `
ChainPacket
| type: "done"; value: string // result of TASK
| type: "error"; severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; reason: string
`.trim();
}

const constraints = (_format: string) =>
  `
- When outputting URLs, ensure that they do not produce a HTTP error or error/empty page.
- If a tool error occurs, try another route. (e.g. a new search, url, or tool.)
- If the TASK is not sufficiently complete, return an error or requestHumanInput ChainPacket.
- Do not get stuck in a loop. (e.g. repeating the same action over and over again.)
- Your output will be reviewed, so ensure it is an accurate and complete execution of the TASK.
`.trim();

// Helper function to generate the execute schema
function executeSchema(format: string, _llmName: string) {
  return `${executeBaseSchema(format, _llmName)}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK in the given SCHEMA:
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

// eslint-disable-next-line @typescript-eslint/require-await
export async function createExecutePrompt(params: {
  task: string;
  returnType: "YAML" | "JSON";
}): Promise<ChatPromptTemplate> {
  const { task, returnType } = params;

  const schema = executeSchema(returnType, "unknown");

  const systemTemplate = `
  Execute TASK: ${task}
  Server TIME: ${new Date().toString()}
  CONSTRAINTS: ${constraints(returnType)}
  SCHEMA: ${schema}
  `.trim();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const humanTemplate = `My TASK is: ${task}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function createCriticizePrompt(params: {
  task: string;
  result: string;
  returnType: "JSON" | "YAML";
}): Promise<ChatPromptTemplate> {
  const { task, result, returnType } = params;

  const schema = criticizeSchema(returnType, "unknown");

  const systemTemplate = `
    Server TIME: ${new Date().toString()}
    CONSTRAINTS: ${constraints(returnType)}
    SCHEMA: ${schema}
    RETURN: ONLY a single ChainPacket with the result of Your TASK in SCHEMA${
      returnType === "JSON" ? ":" : ". Do NOT return JSON:"
    }
    TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK. Calculate a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated IQ (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
    `.trim();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const humanTemplate = `My REVIEWEE TASK: ${task}
  and my REVIEWEE OUTPUT: ${result}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}
