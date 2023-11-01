import { type NextRequest } from "next/server";
import { type Task, type TaskRequestBody } from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";

import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma, type DraftExecutionNode } from "@acme/db";

// POST /ap/v1/agent/tasks
export async function POST(request: NextRequest) {
  const body = (await request.json()) as TaskRequestBody;

  if (!body.input) {
    return Response.json({ message: "Input is required" }, { status: 400 });
  }

  // create a goal and exe
  const session = (await getServerSession(authOptions)) || null;
  const caller = appRouter.createCaller({
    session,
    prisma,
    origin: request.nextUrl.origin,
  });

  const execution = await caller.execution.createForAgentProtocol({
    prompt: body.input as string,
  });

  const task: Task = {
    task_id: execution.id,
    input: body.input,
    additional_input: body.additional_input,
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

  let topByUser: DraftExecutionNode[];
  try {
    topByUser = (await caller.goal.topByUser()) // TODO make a paginating exe only query
      .flatMap((g) => g.executions)
      .flatMap((e) => e.graph?.nodes ?? []);
  } catch {
    topByUser = [];
  }
  const totalItems = topByUser.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (currentPage - 1) * pageSize;

  const paginatedTasks = topByUser.slice(offset, offset + pageSize);

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
