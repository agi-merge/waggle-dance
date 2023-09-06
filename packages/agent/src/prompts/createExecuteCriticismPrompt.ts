import {
  ChatPromptTemplate,
  FewShotPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SemanticSimilarityExampleSelector,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { createEmbeddings, type ChainPacket } from "../..";
import { LLM } from "../utils/llms";

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
- Follow multiple routes; avoid final responses such as "I'm sorry, but I was unable to find information [x]. It may be necessary to try a different approach or check the website at a later time."
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

const highQualityExamples = [
  {
    input:
      "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
    output: {
      type: "success",
      value: {
        task: "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
        revieweeOutput:
          "# Solar Power Comparison\n\n## Rooftop Distributed Solar\n\nCosts: High initial cost, low maintenance cost\nBenefits: Reduces electricity bill, increases property value\nRegional Differences: More effective in sunny regions\nRisks: High upfront cost, dependent on weather\n\n## Utility-Scale Solar\n\nCosts: Lower cost per watt\nBenefits: Large scale power generation, more efficient\nRegional Differences: Requires large land area\nRisks: High initial investment, long payback period\n\n## Community Solar\n\nCosts: Lower cost due to shared resources\nBenefits: Accessible to those who can't install solar panels\nRegional Differences: Depends on community participation\nRisks: Dependent on continued community interest and participation",
        scores: {
          coherence: 0.85,
          creativity: 0.75,
          efficiency: 0.9,
          estimatedIQ: 0.8,
          directness: 0.8,
          resourcefulness: 0.7,
          accuracy: 0.95,
          ethics: 0.85,
          overall: 0.82,
        },
      },
    },
  },
  {
    input:
      "We are attempting to browse the web, but we do not have access to that Skill.",
    output: {
      type: "requestHumanInput",
      reason:
        "We are attempting to browse the web, but we do not have access to that Skill.",
    },
  },
  {
    input:
      "It seems there is an error with the REVIEWEE OUTPUT as it is 'undefined'. This means that the task of reviewing the list of airlines was not completed. Therefore, it's impossible to calculate a weighted score for the criteria provided. The REVIEWEE TASK should be reattempted with a valid output.",
    output: {
      type: "error",
      severity: "fatal",
      message:
        "It seems there is an error with the REVIEWEE OUTPUT as it is 'undefined'. This means that the task of reviewing the list of airlines was not completed. Therefore, it's impossible to calculate a weighted score for the criteria provided. The REVIEWEE TASK should be reattempted with a valid output.",
    },
  },
];

const _counterExamples = [
  {
    input:
      "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
    output: {
      type: "success",
      value: {
        task: "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
        revieweeOutput: "Solar power is good.",
        scores: {
          coherence: 0.95,
          creativity: 0.9,
          efficiency: 0.95,
          estimatedIQ: 0.9,
          directness: 0.9,
          resourcefulness: 0.9,
          accuracy: 0.95,
          ethics: 0.9,
          overall: 0.92,
        },
      },
    },
  },
  {
    input:
      "It seems there is an error with the REVIEWEE OUTPUT as it is 'undefined'. This means that the task of reviewing the list of airlines was not completed. Therefore, it's impossible to calculate a weighted score for the criteria provided. The REVIEWEE TASK should be reattempted with a valid output.",
    output: {
      type: "error",
      severity: "fatal",
      message:
        "It seems there is an error with the REVIEWEE OUTPUT as it is 'undefined'. This means that the task of reviewing the list of airlines was not completed. Therefore, it's impossible to calculate a weighted score for the criteria provided. The REVIEWEE TASK should be reattempted with a valid output.",
      value: {
        task: "Create a markdown document that compares and contrasts the costs, benefits, regional differences, and risks of implementing rooftop distributed solar, versus utility-scale solar, versus community solar.",
        revieweeOutput:
          "# Solar Power Comparison\n\n## Rooftop Distributed Solar\n\nCosts: High initial cost, low maintenance cost\nBenefits: Reduces electricity bill, increases property value\nRegional Differences: More effective in sunnyregions\nRisks: High upfront cost, dependent on weather\n\n## Utility-Scale Solar\n\nCosts: Lower cost per watt\nBenefits: Large scale power generation, more efficient\nRegional Differences: Requires large land area\nRisks: High initial investment, long payback period\n\n## Community Solar\n\nCosts: Lower cost due to shared resources\nBenefits: Accessible to those who can't install solar panels\nRegional Differences: Depends on community participation\nRisks: Dependent on continued community interest and participation",
        scores: {
          coherence: 0.85,
          creativity: 0.75,
          efficiency: 0.9,
          estimatedIQ: 0.8,
          directness: 0.8,
          resourcefulness: 0.7,
          accuracy: 0.95,
          ethics: 0.85,
          overall: 0.82,
        },
      },
    },
  },
];

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

  // Convert highQualityExamples to the desired format
  const formattedHighQualityExamples = highQualityExamples.map((example) => {
    const formattedOutput =
      returnType === "JSON" ? jsonStringify(example) : yamlStringify(example);

    return {
      ...example,
      output: formattedOutput,
    };
  });

  const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
    formattedHighQualityExamples,
    createEmbeddings({ modelName: LLM.embeddings }),
    MemoryVectorStore,
    { k: 2 },
  );

  // Create a prompt template that will be used to format the examples.
  const examplePrompt = new PromptTemplate({
    inputVariables: ["input", "output"],
    template: `Input:\n{input}\nOutput:\n{output}`,
  });

  // Create a FewShotPromptTemplate that will use the example selector.
  const dynamicPrompt = new FewShotPromptTemplate({
    exampleSelector,
    examplePrompt,
    prefix: "",
    suffix: "",
    inputVariables: [],
  });

  const exampleTemplate = await dynamicPrompt.format({ task });
  console.debug(`examples: ${exampleTemplate}`);

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const _examplesSystemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(exampleTemplate);

  const humanTemplate = `My TASK is: ${task}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
    systemMessagePrompt,
    // examplesSystemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}
export enum TaskStatus {
  idle = "idle",
  starting = "starting",
  working = "working",
  done = "done",
  wait = "wait", // for human?
  error = "error",
}

export interface DAGNode {
  id: string;
  name: string;
  act: string;
  context: string;
  params: string | null;
}
export interface DAGEdge {
  sId: string;
  tId: string;
}

export type TaskState = DAGNode & {
  status: TaskStatus;
  fromPacketType: ChainPacket["type"] | "idle";
  result: string | null;
  packets: ChainPacket[];
  updatedAt: Date;
};

// eslint-disable-next-line @typescript-eslint/require-await
export async function createCriticizePrompt(params: {
  revieweeTaskResults: TaskState[];
  returnType: "JSON" | "YAML";
}): Promise<ChatPromptTemplate> {
  const { revieweeTaskResults, returnType } = params;

  const schema = criticizeSchema(returnType, "unknown");

  const systemTemplate = `
    Server TIME: ${new Date().toString()}
    CONSTRAINTS: ${constraints(returnType)}
    SCHEMA: ${schema}
    RETURN: ONLY a single ChainPacket with the results of your TASK in SCHEMA${
      returnType === "JSON" ? ":" : ". Do NOT return JSON:"
    }
    TASK: Review REVIEWEE OUTPUT of REVIEWEE TASK. Calculate a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated IQ (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
    `.trim();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  // todo: convert to use map for each task and result

  const tasksAsHumanMessages = Object.entries(revieweeTaskResults).map(
    (task, i) => {
      return HumanMessagePromptTemplate.fromTemplate(
        `REVIEWEE TASK${i > 0 ? ` ${i}` : ""}:
name: ${task[1].name}
context: ${task[1].context}
act: ${task[1].act}
REVIEWEE OUTPUT:
${task[1].result}`,
      );
    },
  );

  // const humanTemplate = `My REVIEWEE TASK: ${revieweeTask}
  // and my REVIEWEE OUTPUT: ${result}`;
  // const humanMessagePrompt =
  //   HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  // const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  //   systemMessagePrompt,
  //   humanMessagePrompt,
  // ]);

  const promptMessages = [systemMessagePrompt, ...tasksAsHumanMessages];

  return ChatPromptTemplate.fromPromptMessages(promptMessages);
}
