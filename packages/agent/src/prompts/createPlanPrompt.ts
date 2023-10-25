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

import { criticismSuffix } from "./types";

enum PolicyViolation {
  IGNORES_CONTEXT = "IGNORES_CONTEXT",
  INCORRECT_FINAL_NODE_NAME = "INCORRECT_FINAL_NODE_NAME",
  INCORRECT_DEPENDENCIES = "INCORRECT_DEPENDENCIES",
  CIRCULAR_DEPENDENCIES = "CIRCULAR_DEPENDENCIES",
  UNREACHABLE_NODES = "UNREACHABLE_NODES",
  MISSING_CRITICAL_NODE = "MISSING_CRITICAL_NODE",
}

// FIXME: auto-gen this
export const schema = (format: string) =>
  `
  DAG = Level[] // top-level array of levels, level keys shall be numbers not strings
  Level = [key: string]: (Parents | Node)[]] // an array of mixed Parents and Nodes in this level
  Parents
    parents: string[] // an array of level ids that this level is dependent on
  Node
    id: string // e.g. "0", "1", "c" (the node id), unique within the Level.
    name: string // a title description of the Node. Must not contain invalid ${format} characters.
    context: string // Verbose expectations when done and parameters required to complete Task. Must not contain invalid ${format} characters.
It is extremely important to return only valid(⚠) ${format} representation of DAG, with levels as the keys.
`.trim();

const highQualityExamples = [
  {
    remarks: {
      "# General": "This example follows all general rules.",
      "# DAG Construction":
        "The DAG is constructed to maximize parallelism and avoid cycles.",
      "# Node Management": "A criticism node is included in each level.",
      "# Context Isolation":
        "Each node's context is self-contained and sufficient to complete the task.",
      "# Task Breakdown":
        "The tasks are broken down into manageable pieces, each with a clear objective.",
      "# Task Ordering":
        "The tasks are ordered logically, with each task depending on the completion of the tasks in the previous level.",
      "# Goal Delivery":
        "The final task is 'Goal Delivery', indicating that the goal has been satisfactorily completed.",
    },
    tags: ["Research", "Text", "Parallelism"],
    input:
      "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
    output: {
      1: [
        {
          id: "0",
          name: "Research AgentGPT",
          context:
            "Gather information about AgentGPT, its features, capabilities, and limitations",
        },
        {
          id: "1",
          name: "Research AutoGPT",
          context:
            "Gather information about AutoGPT, its features, capabilities, and limitations",
        },
        {
          id: "2",
          name: "Research BabyAGI",
          context:
            "Gather information about BabyAGI, its features, capabilities, and limitations",
        },
        {
          id: "3",
          name: "Research SuperAGI",
          context:
            "Gather information about SuperAGI, its features, capabilities, and limitations",
        },
        {
          id: "4",
          name: "Visit https://waggledance.ai",
          context:
            "Explore the website of Waggledance.ai to gather information about the project",
        },
        {
          id: "c",
          name: "Review the research findings",
          context:
            "Review the gathered information about the projects and identify key similarities and differences",
        },
      ],
      2: [
        {
          parents: [1],
        },
        {
          id: "0",
          name: "Create report outline",
          context:
            "Create an outline for the report, including sections for each project and their comparisons",
        },
        {
          id: "1",
          name: "Write introduction",
          context:
            "Write an introduction to the report, providing an overview of the projects and their significance",
        },
        {
          id: "2",
          name: "Write project descriptions",
          context:
            "Write detailed descriptions of each project, highlighting their key features and capabilities",
        },
        {
          id: "3",
          name: "Compare and contrast projects",
          context:
            "Analyze the gathered information and identify similarities and differences between the projects",
        },
        {
          id: "4",
          name: "Write conclusion",
          context:
            "Summarize the findings and provide a conclusion on the compared projects",
        },
        {
          id: "c",
          name: "Review the sections",
          context:
            "Review the sections for accuracy, clarity, and completeness",
        },
      ],
      3: [
        {
          parents: [2],
        },
        {
          id: "0",
          name: "Merge documents",
          context: "Merge all the written sections into a single document",
        },
        {
          id: "c",
          name: "🔍 Review the merged documents",
          context:
            "Ensure the merge was successful, the document is valid, and the content remains accurate",
        },
      ],
      4: [
        {
          parents: [3],
        },
        {
          id: "0",
          name: "Format report in GFM",
          context:
            "Format the report using GitHub Flavored Markdown (GFM) syntax",
        },
        {
          id: "c",
          name: "🔍 Review the report",
          context: "Review the report for accuracy, clarity, and completeness",
        },
      ],
      5: [
        {
          parents: [4],
        },
        {
          id: "0",
          name: "🍯 Goal Delivery",
          context: "Deliver the final report to the User",
        },
      ],
    },
  },
  {
    remarks: {
      "# Efficient Use of Tools":
        "This example demonstrates efficient use of the Amazon Search tool, extracting multiple pieces of data (names, prices, ratings) in a single step.",
      "# Minimized Levels":
        "The DAG is constructed with minimal levels, reducing complexity and maximizing parallelism.",
      "# Comprehensive Review":
        "Each level includes a criticism node, ensuring each step of the process is reviewed for accuracy.",
      "# Clear Task Breakdown":
        "Tasks are clearly broken down into search, extraction, sorting, and filtering, making the plan easy to understand and follow.",
      "# Logical Task Ordering":
        "Tasks are ordered logically, with data extraction following the search, and sorting and filtering after extraction, reflecting the natural workflow of the task.",
      "# Goal-Oriented":
        "The final task is 'Goal Delivery', clearly indicating the completion of the goal and providing the user with the requested information.",
    },
    tags: ["Amazon Search", "Data Extraction", "Sorting", "Filtering"],
    input:
      "Find the top trending toys for 6-8 year olds on Amazon in April 2023.",
    output: {
      "1": [
        {
          id: "0",
          name: "Search and extract toy data",
          context:
            'Use the "Amazon Search" tool to search for the top trending toys for 6-8 year olds on Amazon in April 2023. Extract the names, prices, and customer ratings of the toys from the search results.',
        },
        {
          id: "c",
          name: "Review the extracted data",
          context:
            "Review the extracted toy names, prices, and ratings to ensure they are accurate.",
        },
      ],
      "2": [
        {
          parents: [1],
          id: "0",
          name: "Sort and filter toys",
          context:
            "Sort the toys based on their popularity or sales rank. Then filter the sorted toys to include only those suitable for 6-8 year olds.",
        },
        {
          id: "c",
          name: "Review the sorted and filtered toys",
          context:
            "Review the sorted and filtered toys to ensure they are in the correct order and appropriate for the age range.",
        },
      ],
      "3": [
        {
          parents: [2],
          id: "0",
          name: "🍯 Goal Delivery",
          context:
            "Provide the User with the top trending toys for 6-8 year olds on Amazon in April 2023, including their prices and customer ratings.",
        },
      ],
    },
  },
];

const constraints = (format: string) =>
  `
# General
- If the Goal is phrased like a question or chat comment that can be confidently satisfied by responding with a single answer, then the only node should be "🍯 Goal Delivery".
- Escape all special characters such as quotation marks, curly braces, colons, etc, according to ${format} rules.
- The only thing you must output is valid ${format} that represents the DAG as the root object.

# DAG Construction
- The graph must not contain cycles. Each task should depend only on the levels that precede it.
- The DAG shall be constructed in a way such that its parallelism is maximized (siblings maximized, levels minimized.)
- Sibling nodes within each level can be run in parallel since they will not logically depend on one another, except the criticism node.
- All levels must eventually lead to a "🍯 Goal Delivery" Task which, after executing, ensures that the Goal has been satisfactorily completed.

# Node Management
- For every level in the DAG, include a single node with id "${criticismSuffix}". It will run after all other nodes in the level have been executed.

# Context Isolation
- Node context must be self-contained and sufficient to complete the Task according to the Goal.
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
To come up with an efficient and expert Plan to solve the User's Goal, according to the Schema.
## Available Tools:
[${toolNames}]
## User's Goal:
${goalPrompt}
## Current Time
${new Date().toString()}
*Reflect on the Current Time in regards to the Plan and your Knowledge Cutoff.*
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
## Plan:
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  const humanTemplate = `My Goal is: ${goalPrompt}`;
  const humanMessagePrompt =
    HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const chatPrompt = ChatPromptTemplate.fromPromptMessages([
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
