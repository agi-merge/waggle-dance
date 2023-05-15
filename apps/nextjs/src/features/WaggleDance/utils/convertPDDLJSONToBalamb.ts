// import { type SeedDef } from "balamb";
// import { type JsonObject } from "langchain/tools";

// export interface PDDLJSON extends JsonObject {
//   domain: string;
//   types: Record<string, string>;
//   predicates: Record<string, string[]>;
//   actions: Record<string, Action>;
// }

// export type Action = {
//   parameters: string[];
//   precondition: string[];
//   effect: string[];
// };

// export default function convertPDDLJSONtoBalambSeeds(
//   pddl: PDDLJSON,
// ): SeedDef<any, any>[] {
//   const seeds: SeedDef<any, any>[] = [];

//   Object.entries(pddl.actions).forEach(([actionName, action]) => {
//     const seed: SeedDef<any, any> = {
//       id: actionName,
//       description: `Execute action: ${actionName}`,
//       plant: async (dependencies: any) => {
//         const input = action.parameters.map((param) => dependencies[param]);
//         // TODO: Replace this with the actual function to execute the action.
//         const result = `Result of action ${actionName} with input ${JSON.stringify(
//           input,
//         )}`;
//         await new Promise((resolve) => setTimeout(resolve, 1));
//         console.log(`Executed action ${actionName} with result: "${result}"`);
//         return result;
//       },
//       dependsOn: Object.fromEntries(
//         action.parameters.map((param) => [
//           param,
//           {
//             id: param,
//             description: `Parameter: ${param}`,
//             plant: async () => param,
//           },
//         ]),
//       ),
//     };

//     seeds.push(seed);
//   });

//   return seeds;
// }

// // Example usage
// // const pddl: PDDLJSON = {
// //   domain: "large_language_model",
// //   types: {
// //     question: "object",
// //     answer: "object",
// //     task: "object",
// //   },
// //   // ...
// // };

// // const seeds = convertPDDLJSONtoBalambSeeds(pddl);
