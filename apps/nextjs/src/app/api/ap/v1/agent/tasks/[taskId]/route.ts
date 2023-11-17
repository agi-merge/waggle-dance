import { type NextRequest } from "next/server";
import { type Artifact, type Task } from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma } from "@acme/db";

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

  const artifacts: Artifact[] =
    exe.results?.map((r) => {
      return {
        artifact_id: r.id,
        agent_created: true,
        file_name: r.id,
        relative_path: r.artifactUrls[0] || null,
        created_at: r.createdAt.toISOString() ?? new Date().toISOString(),
      };
    }) || [];

  const task: Task = {
    task_id: taskId,
    input: goal?.prompt,
    artifacts,
    // this was required by the tests, but it is not being passed through our data model.
    additional_input: {},
  };

  return Response.json(task, { status: 200 });
}
