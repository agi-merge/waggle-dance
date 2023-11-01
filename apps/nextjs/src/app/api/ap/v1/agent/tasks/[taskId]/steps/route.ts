import { NextResponse, type NextRequest } from "next/server";
import { type StepRequestBody } from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma } from "@acme/db";

// POST /ap/v1/agent/tasks/:taskId/steps
export async function POST(
  request: NextRequest,
  { params: { taskId } }: { params: { taskId: string } },
): Promise<void | Response> {
  if (!taskId) {
    return Response.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }
  const body = (await request.json()) as StepRequestBody;

  if (!body.input) {
    return Response.json({ message: "Input is required" }, { status: 400 });
  }

  const session = (await getServerSession(authOptions)) || null;

  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: request.nextUrl.origin,
  });

  // const goal = await caller.goal.byId(taskId);
  // const exe = await caller.execution.create({ goalId: taskId });
  const exe = await caller.execution.byId({ id: taskId });

  if (!exe || !exe.goalId) {
    return NextResponse.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }

  const plan = await caller.execution.createPlan({
    executionId: exe.id,
    goalId: taskId,
    goalPrompt: body.input as string,
    creationProps: {},
  });

  return Response.json(plan, { status: 200 });
}

// GET /ap/v1/agent/tasks/:taskId/steps
export async function GET(
  request: NextRequest,
  { params: { taskId } }: { params: { taskId: string } },
) {
  if (!taskId) {
    return NextResponse.json(
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

  const execution = await caller.execution.byId({ id: taskId });

  const results = execution?.results;
  const steps = execution?.graph?.nodes.map((node, i) => {
    const artifactFromResult = results?.find((r) => r.nodeId === node.id)
      ?.value;
    const isLast = i === execution?.graph?.nodes.length ?? 0 - 1;
    return {
      name: node.name,
      output: artifactFromResult,
      artifacts: [],
      is_last: isLast,
      input: node.context,
      task_id: taskId,
      step_id: node.id,
      status: artifactFromResult,
    };
  });
  return Response.json(steps, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
