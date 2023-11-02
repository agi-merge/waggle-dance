import { type NextRequest } from "next/server";
import { type Task } from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma } from "@acme/db";

// // POST /ap/v1/agent/tasks/:taskId
// // task == exe
// // additional_input may be used by a caller to avoid making a new goal each time
// export async function POST(
//   request: NextRequest,
//   { params: { taskId } }: { params: { taskId: string } },
// ): Promise<void | Response> {
//   if (!taskId) {
//     return Response.json(
//       { message: "Unable to find entity with the provided id" },
//       { status: 404 },
//     );
//   }
//   const body = (await request.json()) as TaskRequestBody;
//   const additionalInput = body.additional_input as { goal_id: string };
//   let additionalGoalId: string | null = null;
//   if (additionalInput && additionalInput.goal_id) {
//     additionalGoalId = additionalInput.goal_id;
//   }
//   if (!body.input) {
//     return Response.json({ message: "Input is required" }, { status: 400 });
//   }

//   const session = (await getServerSession(authOptions)) || null;

//   const caller = appRouter.createCaller({
//     session,
//     prisma,
//     origin: request.nextUrl.origin,
//   });

//   const goalId = additionalGoalId
//     ? additionalGoalId
//     : (await caller.goal.create({ prompt: body.input as string })).id;
//   const exe = await caller.execution.create({ goalId: goalId });
//   const plan = await caller.execution.createPlan({
//     executionId: exe.id,
//     goalId: taskId,
//     goalPrompt: body.input as string,
//     creationProps: { modelName: LLM_ALIASES["fast"], maxTokens: 350 },
//     headers: request.headers,
//   });

//   return Response.json(plan, { status: 200 });
// }

// GET /ap/v1/agent/tasks/:taskId
export async function GET(
  request: NextRequest,
  { params: { taskId } }: { params: { taskId: string } },
) {
  if (!taskId) {
    return Response.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }
  const session = (await getServerSession(authOptions)) || null;

  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: request.nextUrl.origin,
  });

  const exe = await caller.execution.byId({ id: taskId });

  if (!exe || !exe.goalId) {
    return Response.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }

  const goal = await caller.goal.byId(exe.goalId);

  // artifact_id: string;
  // agent_created: boolean;
  // file_name: string;
  // relative_path: string | null;
  // created_at: string;
  // const artifacts: Artifact[] = exe.results?.map((r) => {return {artifact_id: r.id, "agent_created": true, file_name: r. }}) || [];

  const task: Task = {
    task_id: taskId,
    input: goal?.prompt,
    artifacts: [],
    // this was required by the tests, but it is not being passed through our data model.
    additional_input: {},
  };

  return Response.json(task, { status: 200 });
}
