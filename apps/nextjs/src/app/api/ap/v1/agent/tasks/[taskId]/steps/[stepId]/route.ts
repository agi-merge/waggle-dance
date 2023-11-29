import { type NextRequest } from "next/server";

import { appRouter } from "@acme/api";
import { auth } from "@acme/auth";
import { prisma } from "@acme/db";

// GET /ap/v1/agent/tasks/:taskId/steps/:stepId
export async function GET(
  req: NextRequest,
  {
    params: { taskId, stepId },
  }: { params: { taskId: string; stepId: string } },
) {
  if (!taskId) {
    return Response.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }

  const session = await auth();

  const caller = appRouter.createCaller({
    session: session || null,
    db: prisma,
    origin: req.nextUrl.origin,
  });
  const exe = await caller.execution.byId({ id: taskId });
  if (!exe || !exe.id) {
    return Response.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }
  const taskSteps = exe.graph?.nodes || [];

  const step = taskSteps.find((step) => step.id === stepId);

  return Response.json(step, {
    status: 200,
  });
}
