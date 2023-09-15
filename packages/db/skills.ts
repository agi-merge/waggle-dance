import { z } from "zod";

import { type Skillset } from ".";

export type SkillsetCreate = Omit<Skillset, "index" | "id"> & {
  schema: z.ZodObject<z.ZodRawShape>;
};
export type NullableSkillset = Skillset | undefined | null;

const skillsData: SkillsetCreate[] = [
  {
    label: "Notify Human for Help",
    isRecommended: true,
    description:
      "Receive notifications when the AI needs clarification or help with something like account access, or an error has occurred.",
    schema: z.object({}),
  },
  {
    label: "🏃‍♀️ Context Baton",
    isRecommended: true,
    description: "Parent → Child context passing",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "💭 Memory",
    isRecommended: true,
    description: "Entities, agent internal scratch pad, vector database",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "🗄️ Database",
    isRecommended: true,
    description: "Query databases",
    schema: z.object({}),
    // risk: "medium",
  },
  {
    label: "✉️ Email",
    isRecommended: false,
    description: "Send emails, react to emails",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🪝 Webhook",
    isRecommended: false,
    description: "React to webhooks",
    schema: z.object({}),
    // risk: "low",
  },
  {
    label: "🖥️ REST API",
    isRecommended: false,
    description: "Make HTTP requests",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🍴 Git",
    isRecommended: false,
    description: "Push, pull, open pull requests, manage CI, etc.",
    schema: z.object({}),
    // risk: "high",
  },
  {
    label: "🌐 Browser",
    isRecommended: true,
    description:
      "Use a headless browser to view, scrape, or interact with websites",
    schema: z.object({}),
    // risk: "medium",
  },
  {
    label: "Files",
    description: "Read, write, and watch files",
    schema: z.object({}),
    isRecommended: false,
    // risk: "low",
  },
];

export const skillDatabase: Skillset[] = skillsData.map((skill, index) => ({
  ...skill,
  id: `${index}`,
  index,
}));

// Jest test case
// describe("transformWireFormat", () => {
//   it("handles multiple concurrent levels correctly", () => {
//     const newFormat = {
//       "1": [
//         {
//           id: "0",
//           name: "📚 Research AgentGPT",
//           context:
//             "Gather information about AgentGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//       ],
//       "2": [
//         {
//           id: "0",
//           name: "📚 Research AutoGPT",
//           context:
//             "Gather information about AutoGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//       ],
//       "3": [
//         {
//           parents: [1, 2],
//         },
//         {
//           id: "0",
//           name: "📝 Create report outline",
//           context:
//             "Create an outline for the report, including sections for each project and their comparisons",
//         },
//         {
//           id: "c",
//           name: "🔍 Review the sections",
//           context:
//             "Review the sections for accuracy, clarity, and completeness",
//         },
//       ],
//     };

//     const expectedOldFormat = {
//       nodes: [
//         {
//           id: "1-0",
//           name: "📚 Research AgentGPT",
//           context:
//             "Gather information about AgentGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "1-c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//         {
//           id: "2-0",
//           name: "📚 Research AutoGPT",
//           context:
//             "Gather information about AutoGPT, its features, capabilities, and limitations",
//         },
//         {
//           id: "2-c",
//           name: "🔍 Review the research findings",
//           context:
//             "Review the gathered information about the projects and identify key similarities and differences",
//         },
//         {
//           id: "3-0",
//           name: "📝 Create report outline",
//           context:
//             "Create an outline for the report, including sections for each project and their comparisons",
//         },
//         {
//           id: "3-c",
//           name: "🔍 Review the sections",
//           context:
//             "Review the sections for accuracy, clarity, and completeness",
//         },
//       ],
//       edges: [
//         {
//           sId: "1-0",
//           tId: "1-c",
//         },
//         {
//           sId: "2-0",
//           tId: "2-c",
//         },
//         {
//           sId: "1-c",
//           tId: "3-0",
//         },
//         {
//           sId: "2-c",
//           tId: "3-0",
//         },
//         {
//           sId: "3-0",
//           tId: "3-c",
//         },
//       ],
//     };

//     expect(transformWireFormat(newFormat)).toEqual(expectedOldFormat);
//   });
// });
