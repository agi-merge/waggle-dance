// agent/prompts/createPlanPrompt.ts

import { type Tool } from "langchain/dist/tools/base";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

import { criticismSuffix } from "./types";

// FIXME: auto-gen this
export const schema = (format: string) =>
  `
  DAG = Level[] // top-level array of levels, level keys shall be numbers not strings
  Level = [key: string]: (Parents | Node)[]] // an array of mixed Parents and Nodes in this level
  Parents
    parents: string[] // an array of level ids that this level is dependent on
  Node
    id: string // e.g. "0", "1", "c" (the node id)
    name: string // a unique-amongst-nodes emoji plus a short description of the node
    context: string // useful description that provides context that improves the likelihood that the node will be executed correctly and efficiently
It is extremely important to return only valid(⚠) ${format} representation of DAG, with levels as the keys.
`.trim();

const highQualityExamples = [
  {
    input:
      "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
    output: {
      1: [
        {
          id: "0",
          name: "📚 Research AgentGPT",
          context:
            "Gather information about AgentGPT, its features, capabilities, and limitations",
        },
        {
          id: "1",
          name: "📚 Research AutoGPT",
          context:
            "Gather information about AutoGPT, its features, capabilities, and limitations",
        },
        {
          id: "2",
          name: "📚 Research BabyAGI",
          context:
            "Gather information about BabyAGI, its features, capabilities, and limitations",
        },
        {
          id: "3",
          name: "📚 Research SuperAGI",
          context:
            "Gather information about SuperAGI, its features, capabilities, and limitations",
        },
        {
          id: "4",
          name: "🌐 Visit https://waggledance.ai",
          context:
            "Explore the website of Waggledance.ai to gather information about the project",
        },
        {
          id: "c",
          name: "🔍 Review the research findings",
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
          name: "📝 Create report outline",
          context:
            "Create an outline for the report, including sections for each project and their comparisons",
        },
        {
          id: "1",
          name: "📝 Write introduction",
          context:
            "Write an introduction to the report, providing an overview of the projects and their significance",
        },
        {
          id: "2",
          name: "📝 Write project descriptions",
          context:
            "Write detailed descriptions of each project, highlighting their key features and capabilities",
        },
        {
          id: "3",
          name: "📝 Compare and contrast projects",
          context:
            "Analyze the gathered information and identify similarities and differences between the projects",
        },
        {
          id: "4",
          name: "📝 Write conclusion",
          context:
            "Summarize the findings and provide a conclusion on the compared projects",
        },
        {
          id: "c",
          name: "🔍 Review the sections",
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
          name: "📝 Merge documents",
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
          name: "📝 Format report in GFM",
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
];

const constraints = (format: string) =>
  `
- If the GOAL is phrased like a question or chat comment that can be confidently satisfied by responding with a single answer, then the only node should be "🍯 Goal Delivery".
- The DAG shall be constructed in a way such that its parallelism is maximized (siblings maximized, levels minimized.)
- Sibling nodes within each level can be run in parallel since they will not logically depend on one another, except the criticism node.
- All levels must eventually lead to a "🍯 Goal Delivery" task which, after executing, ensures that the GOAL has been satisfactorily completed.
- Escape all special characters such as quotation marks, curly braces, etc.
- For every level in the DAG, include a single node with id "${criticismSuffix}". It will run after all other nodes in the level have been executed.
- THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the DAG as the root object.`.trim();

export function createPlanPrompt(params: {
  goal: string;
  goalId: string;
  tools: Tool[];
  returnType: "JSON" | "YAML";
}): ChatPromptTemplate {
  const { goal, tools, returnType } = params;
  const prettyTools = tools.map((tool) => {
    return { name: tool.name, description: tool.description };
  });
  const stringifiedTools =
    returnType === "JSON"
      ? jsonStringify(prettyTools)
      : yamlStringify(prettyTools);
  const template = `
YOU: A general goal-solving AI employed by the User to solve the User's GOAL.
TEAM TOOLS:
${stringifiedTools}
GOAL: ${goal}
NOW: ${new Date().toString()}
SCHEMA: ${schema(returnType)}
CONSTRAINTS: ${constraints(returnType)}
EXAMPLES:

  ${
    returnType === "JSON"
      ? jsonStringify(highQualityExamples)
      : yamlStringify(highQualityExamples)
  }
]
TASK: To come up with an efficient and expert plan to solve the User's GOAL, according to SCHEMA:
`.trimEnd();

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(template);

  const humanTemplate = `My GOAL is: ${goal}`;
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
