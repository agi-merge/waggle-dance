// import Balamb, { BalambError, SeedDef } from "balamb";

// import {
//   PlanResult,
//   Review,
//   ReviewResult,
//   TaskResult,
//   TaskSimulationCallbacks,
// } from "./types";

// class ChainMachineSimulation {
//   async runTaskWithReview(
//     taskName: string,
//     callbacks: TaskSimulationCallbacks,
//   ) {
//     const subTaskCount = 1 + Math.floor(Math.random() * 10);
//     var tasks: string[] = [];
//     for (let i = 0; i < subTaskCount; i++) {
//       const newTaskId = `subTask-${this.generateTaskName()}`;
//       tasks.push(newTaskId);
//     }
//     console.log(`Planned ${subTaskCount} new tasks for ${taskName}`);

//     const plan: SeedDef<PlanResult, void> = {
//       id: `plan-${taskName}`,
//       description: "Plan tasks to achieve goal",
//       plant: async () => {
//         callbacks.onTaskCreated({ id: `plan-${taskName}` });

//         return { planId: `plan-${taskName}`, tasks };
//       },
//     };

//     const getSubtaskResult = (of: string) => {
//       const getSubtaskResult: SeedDef<TaskResult, { planResult: PlanResult }> =
//         {
//           id: `${of}`,
//           description: "Get results of subtasks",
//           dependsOn: { planResult: plan },
//           plant: async ({ planResult }) => {
//             callbacks.onTaskCreated(
//               { id: `${of}` },
//               { target: planResult.planId, source: `${of}` },
//             );
//             const result = `${Math.random()}`;
//             console.log(`Got result ${result} for ${of}`);
//             return { taskId: `${of}`, result } as TaskResult;
//           },
//         };
//       return getSubtaskResult;
//     };

//     const reviewSubtask = (of: string) => {
//       const reviewSubtask: SeedDef<ReviewResult, { taskResult: TaskResult }> = {
//         id: `review-${of}`,
//         description: "Review a plan and determine if needs cancellation",
//         dependsOn: { taskResult: getSubtaskResult(of) },
//         plant: async ({ taskResult }) => {
//           const review: Review = {
//             overall: Math.random(),
//           };
//           callbacks.onTaskCreated(
//             { id: `review-${of}` /*, label: taskResult.result */ },
//             { target: `review-${of}`, source: taskResult.taskId },
//           );
//           if (review.overall < 0.01) {
//             throw new Error(`random review failure of target: ${plan.id}`);
//           }
//           return { target: plan.id, review };
//         },
//       };
//       return reviewSubtask;
//     };

//     const reviewPlan: SeedDef<ReviewResult, { planResult: PlanResult }> = {
//       id: `review-${plan.id}`,
//       description: "Review a plan and determine if needs cancellation",
//       dependsOn: { planResult: plan },
//       plant: async ({ planResult }) => {
//         callbacks.onTaskCreated(
//           { id: `review-${plan.id}` },
//           { target: `review-${plan.id}`, source: plan.id },
//         );
//         const review: Review = {
//           overall: Math.random(),
//         };
//         console.log(`Reviewed plan ${plan.id} with result ${review.overall}`);
//         return { target: plan.id, review };
//       },
//     };

//     const seeds: SeedDef<any, any>[] = tasks.map((task) => {
//       return reviewSubtask(task);
//     });
//     seeds.unshift(reviewPlan);
//     try {
//       const taskResult = await Balamb.run(seeds);
//       if (taskResult instanceof BalambError) {
//         console.error(taskResult);
//         callbacks.onReviewFailure(taskName, taskResult);
//       } else {
//         console.log(JSON.stringify(taskResult));
//         return taskResult;
//       }
//     } catch (error) {
//       if (error instanceof Error) {
//         console.error(error);
//         callbacks.onReviewFailure(taskName, error);
//       }
//     }
//     throw new Error("Task simulation failed");
//   }

//   generateTaskName(): string {
//     return `${Math.floor(Math.random() * 10000)}`;
//   }

//   async run(callbacks: TaskSimulationCallbacks) {
//     return await this.runTaskWithReview(
//       `GOAL-${this.generateTaskName()}`,
//       callbacks,
//     );
//   }
// }

// export default ChainMachineSimulation;
