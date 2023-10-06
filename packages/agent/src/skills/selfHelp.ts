// import { z } from "zod";

// import DynamicZodSkill from "./DynamicZodSkill";
// import { callExecutionAgent } from "../strategy/callExecutionAgent"

// const schema = z.object({
//   taskId: z.string().nonempty().describe("Your TASK"),
//   severity: z
//     .enum(["high", "medium", "low"])
//     .describe(
//       "E.g. (high: we were unable to perform the task due to repetitive skill errors), (med: we need clarification before continuing), (low: we predict that the task will fail)",
//     ),
//   ask: z
//     .string()
//     .nonempty()
//     .describe(
//       "What we want to prompt the USER with to help us continue with our TASK. Provide lots of details.",
//     ),
// });

// const selfHelpSkill = new DynamicZodSkill({
//   name: "selfHelp",
//   description: `Use before giving up. If you are stuck, or repetitive skill errors occur, you can use this skill to brainstorm new methods of achieving the TASK.`,
//   func: async (input, _runManager) => {
//     const { taskId, severity, ask } = schema.parse(input);
//     return await callExecutionAgent()
//   },
//   schema,
// });

// export default selfHelpSkill;
