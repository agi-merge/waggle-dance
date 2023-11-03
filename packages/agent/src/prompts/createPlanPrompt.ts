// agent/prompts/createPlanPrompt.ts

import { type StructuredTool } from "langchain/dist/tools/base";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";
import { zodToJsonSchema } from "zod-to-json-schema";

import { ExecutionNodeModel } from "@acme/db";

import { criticismSuffix } from "./types";

const MinimalNodeSchema = ExecutionNodeModel.pick({
  id: true,
  name: true,
});

// FIXME: auto-gen this
const nodeSchema = (returnType: "JSON" | "YAML") => {
  const jsonSchema = zodToJsonSchema(MinimalNodeSchema);
  const stringified =
    returnType === "JSON"
      ? jsonStringify(jsonSchema)
      : yamlStringify(jsonSchema);
  return stringified;
};
export const schema = (returnType: "JSON" | "YAML") =>
  `
DAG = Level[] // top-level array of Level, Level keys shall be numbers not strings
Level = [key: string]: (Parents | Node)[]] // an array of mixed Parents and Nodes in this Level
Parents
  parents: string[] // an array of Level ids that this Level is dependent on
${nodeSchema(returnType)}
It is extremely important to return only valid(⚠) ${returnType} representation of DAG, with Levels as the keys.
`.trim();

const highQualityExamples = [
  {
    remarks: {
      "Zero-shot":
        "You may return a single-Node/Task DAG for Goals that are achievable without using any Tools, only relying on your Knowledge prior to its cut-off date.",
      "Knowledge Cut-off":
        "The Time is not much greater than your Knowledge cut-off date, and the speed of light is a physical constant unlikely to have been changed or updated in the time lapse.",
    },
    input: {
      Time: "5 Nov. 2023",
      "Available Tools": ["web-browser", "Google Search"],
      goal: "What is the speed of light?",
    },
  },
  {
    remarks: {
      Paste:
        "Since you are a headless AI agent who is provided all relevant information, you do not need to copy and paste.",
      "Minimized Steps":
        "Given the Available Tools, the access and extract step may be done in a single Task since the web-browser visits and also extracts. Furthermore, there are multiple Tools that may be able to help.",
      "Goal Delivery":
        "The last Node is 🍯 Goal Delivery, and it can be assumed that the Goal Delivery agent is capable of writing to the .txt file.",
      Review:
        "The DAG includes a criticism Node for each Level except the last.",
      "Task Naming":
        "The DAG does not prescribe tools in the Node names. Instead, it describes the Node name, which can be used to synthesize enough information to use the Tools if needed.",
      "Tool Selection": "",
    },
    input: {
      "Available Tools": [
        "Amazon Search",
        "Write File",
        "web-browser",
        "JavaScript eval()",
      ],
      goal: "Open 'https://silennaihin.com/random/plain.html' and paste all of the text on the page in a .txt file",
    },
    output: {
      "1": [
        {
          id: "0",
          name: "Access and extract text from 'https://silennaihin.com/random/plain.html'",
        },
        {
          id: "c",
          name: "Review the extracted text",
        },
      ],
      "2": [
        {
          parents: [1],
        },
        {
          id: "0",
          name: "🍯 Goal Delivery",
        },
      ],
    },
  },
  {
    remarks: {
      "Efficient Use of Tools":
        "This example demonstrates efficient use of the Amazon Search Tool, extracting multiple pieces of data (names, prices, ratings) in a single step.",
      "Minimized Levels":
        "The DAG is constructed with minimal Levels, reducing complexity, but fails to achieve parallelism.",
      "Comprehensive Review":
        "Each Level includes a criticism Node, ensuring each step of the process is reviewed for accuracy.",
      "Clear Task Breakdown":
        "Tasks are clearly broken down into search, extraction, sorting, and filtering, making the Plan easy to understand and follow.",
      "Logical Task Ordering":
        "Tasks are ordered logically, with data extraction following the search, and sorting and filtering after extraction, reflecting the natural workflow of the Task.",
      "Goal-Oriented":
        "The final Task is 'Goal Delivery', clearly indicating the completion of the Goal and providing the User with the requested information.",
    },
    tags: ["Amazon Search", "Data Extraction", "Sorting", "Filtering"],
    input: {
      Time: "5 Nov. 2023",
      "Available Tools": [
        "Write File",
        "web-browser",
        "Google Search",
        "Amazon Search",
      ],
      goal: "Find the top trending toys for 6-8 year olds on Amazon in April 2023.",
    },
    output: {
      1: [
        {
          id: "0",
          name: "Search and extract toy data",
        },
        {
          id: "c",
          name: "Review the extracted data",
        },
      ],
      2: [
        {
          parents: [1],
          id: "0",
          name: "Sort and filter toys",
        },
        {
          id: "c",
          name: "Review the sorted and filtered toys",
        },
      ],
      3: [
        {
          parents: [2],
          id: "0",
          name: "🍯 Goal Delivery",
        },
      ],
    },
  },
  {
    remarks: {
      General: "This example follows all general rules.",
      "DAG Construction":
        "The DAG is constructed to maximize parallelism and avoid cycles.",
      "Node Management": "A criticism Node is included in each Level.",
      "Context Isolation":
        "Each Node's context is self-contained and sufficient to complete the Task.",
      "Task Breakdown":
        "The Tasks are broken down into manageable pieces, each with a clear objective.",
      "Task Ordering":
        "The Tasks are ordered logically, with each Task depending on the completion of the Tasks in the previous Level.",
      "Self-Awareness":
        " A 'Write report outline' or 'Combine Research' Task/Node was conspicuously not included, since every Task has all prior relevant information re-synthesized for it.",
      "Non-obvious Dependencies":
        "The conclusion was cleverly moved from Level 2 to Level 3, since things like conclusions are dependent/distilled from the rest of the document.",
      "Goal Delivery":
        "The final Task is 'Goal Delivery', indicating that the goal has been satisfactorily completed.",
    },
    tags: ["Research", "Text", "Parallelism"],
    input: {
      Time: "5 Nov. 2023",
      "Available Tools": [
        "web-browser",
        "Google Search",
        "Amazon Search",
        "Request Human Help",
        "Calculator",
        "arXiv Search",
        "Wikipedia Search",
        "Write File",
        "Google Scholar",
        "Google Translate",
      ],
      goal: "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
    },
    output: {
      1: [
        {
          id: "0",
          name: "Research AgentGPT",
        },
        {
          id: "1",
          name: "Research AutoGPT",
        },
        {
          id: "2",
          name: "Research BabyAGI",
        },
        {
          id: "3",
          name: "Research SuperAGI",
        },
        {
          id: "4",
          name: "Visit https://waggledance.ai",
        },
        {
          id: "c",
          name: "Review the research findings",
        },
      ],
      2: [
        {
          parents: [1],
        },
        {
          id: "0",
          name: "Write introduction",
        },
        {
          id: "1",
          name: "Write project descriptions",
        },
        {
          id: "2",
          name: "Compare and contrast projects",
        },
        {
          id: "c",
          name: "Review the sections",
        },
      ],
      3: [
        {
          parents: [2],
        },
        {
          id: "0",
          name: "Merge documents and write conclusion",
        },
        {
          id: "c",
          name: "🔍 Review the merged documents",
        },
      ],
      4: [
        {
          parents: [3],
        },
        {
          id: "0",
          name: "Format report in GFM",
        },
        {
          id: "c",
          name: "🔍 Review the report",
        },
      ],
      5: [
        {
          parents: [4],
        },
        {
          id: "0",
          name: "🍯 Goal Delivery",
        },
      ],
    },
  },
];

const constraints = (format: string) =>
  `
### General
- Node is a synonym for Task.
- If the Goal is phrased like a question or chat comment that can be confidently satisfied by responding with a single answer, then the only Node should be "🍯 Goal Delivery".
- Escape all special characters such as quotation marks, curly braces, colons, etc, according to ${format} rules.
- The only thing you must output is valid ${format} that represents the DAG as the root object.

### DAG Construction
- The graph must not contain cycles. Each Task should depend only on the Levels that precede it.
- The DAG shall be constructed in a way such that its parallelism is maximized (siblings maximized, Level count minimized.)
- Sibling Nodes within each Level can be run in parallel since they will not logically depend on one another, except the criticism Node.
- All Level must eventually lead to a "🍯 Goal Delivery" Task which, after executing, ensures that the Goal has been satisfactorily completed.

### Node Management
- For every Level in the DAG, include a single Node with id "${criticismSuffix}". It will run after all other Nodes in the Level have been executed.

### Temporal Logic
- Consider the provided Current Time and be aware that your training data only includes information up to your last training cut-off.

# Context Isolation
- Node context must be self-contained and sufficient to complete the Task according to the Goal.
- Avoid prescribing Tools directly in the context, instead, prefer to give a great name and context to the Task.
`.trim();

export function createPlanPrompt(params: {
  goalPrompt: string;
  goalId: string;
  tools: StructuredTool[];
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { goalPrompt, tools, returnType } = params;
  const toolNames = tools.map((tool) => tool.name).join(",");

  const template = `
> Thank you so much for trying hard on my behalf!
>  - User ❤️
# Directive
You are a general Goal-solving AI employed by the User to solve the User's Goal.
# Task:
Generate a detailed plan that efficiently achieves the User's Goal, ensuring the plan adheres to the provided schema.
## Available Tools:
[${toolNames}]
## Current Time
${new Date().toString()}
## Schema:
${schema(returnType)}
## Rules:
${constraints(returnType)}
## Examples:
  ${
    returnType === "JSON"
      ? jsonStringify(highQualityExamples)
      : yamlStringify(highQualityExamples)
  }
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  const humanTemplate = `I am the User! My Goal is: ${goalPrompt}, respond ONLY with your Plan:`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromMessages([
    systemMessagePrompt,
    humanMessagePrompt,
  ]);

  return chatPrompt;
}

export function createPlanFormattingPrompt(
  input: string,
  output: string,
  returnType: "JSON" | "YAML",
): PromptTemplate {
  const template = `TASK: You are to REWRITE only the OUTPUT of a large language model for a given INPUT, ensuring that it is valid ${returnType}, validates for the SCHEMA, and adequately addresses the INPUT.
  SCHEMA: ${schema(returnType)}
  CONSTRAINT: **DO NOT** output anything other than the ${returnType}, e.g., do not include prose or markdown formatting.
  INPUT:
  ${input}
  OUTPUT:
  ${output}
  REWRITE:
  `;
  return PromptTemplate.fromTemplate(template);
}
