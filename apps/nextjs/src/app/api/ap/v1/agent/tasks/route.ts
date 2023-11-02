import { type NextRequest } from "next/server";
import { type Task, type TaskRequestBody } from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";

import { LLM_ALIASES } from "@acme/agent/src/utils/llms";
import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma, type DraftExecutionNode } from "@acme/db";

// POST /ap/v1/agent/tasks
export async function POST(request: NextRequest) {
  const body = (await request.json()) as TaskRequestBody;
  if (!body.input) {
    return;
    Response.json({ message: "Input is required" }, { status: 400 });
  }
  const additionalInput = body.additional_input as { goal_id: string };
  let additionalGoalId: string | null = null;
  if (additionalInput && additionalInput.goal_id) {
    additionalGoalId = additionalInput.goal_id;
  }

  // create a goal and exe
  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: request.nextUrl.origin,
  });

  const goalId = additionalGoalId
    ? additionalGoalId
    : (await caller.goal.create({ prompt: body.input as string })).id;
  const exe = await caller.execution.create({ goalId: goalId });
  const cookie = request.headers.get("cookie");

  const _plan = await caller.execution.createPlan({
    executionId: exe.id,
    goalId,
    goalPrompt: body.input as string,
    creationProps: { modelName: LLM_ALIASES["fast"], maxTokens: 350 },
    cookie: cookie || "",
  });

  const task: Task = {
    task_id: exe.id,
    input: body.input,
    artifacts: [],
  };

  return Response.json(task, { status: 200 });
}

// GET /ap/v1/agent/tasks
// FIXME: this does not map cleanly to our model, so we will return all executions
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pageSize = Number(params.get("page_size") ?? 10);
  const currentPage = Number(params.get("current_page") ?? 1);
  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: request.nextUrl.origin,
  });

  let nodes: DraftExecutionNode[];
  try {
    const exe = await caller.graph.topByUser({ currentPage, pageSize });
    nodes = exe?.graph?.nodes ?? [];
  } catch {
    nodes = [];
  }
  const totalItems = nodes.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (currentPage - 1) * pageSize;

  const paginatedTasks = nodes.slice(offset, offset + pageSize);

  const pagination = {
    total_items: totalItems,
    total_pages: totalPages,
    current_page: currentPage,
    page_size: pageSize,
  };

  const tasks: Task[] = paginatedTasks.map((exe) => ({
    task_id: exe.id,
    input: exe.context || undefined,
    artifacts: [],
  }));

  return Response.json({ tasks, pagination });
}
