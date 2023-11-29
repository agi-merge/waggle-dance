import { type NextRequest } from "next/server";
import { type Task, type TaskRequestBody } from "lib/AgentProtocol/types";

import { LLM_ALIASES } from "@acme/agent/src/utils/llms";
import { appRouter } from "@acme/api";
import { auth } from "@acme/auth";
import { prisma, type ExecutionPlusGraph, type Goal } from "@acme/db";

// POST /ap/v1/agent/tasks
export async function POST(request: NextRequest) {
  const body = (await request.json()) as TaskRequestBody;
  if (!body.input) {
    return Response.json({ message: "Input is required" }, { status: 400 });
  }
  const additionalInput = body.additional_input as { goal_id: string };
  let additionalGoalId: string | null = null;
  if (additionalInput && additionalInput.goal_id) {
    additionalGoalId = additionalInput.goal_id;
  }

  // const headers = request.headers.forEach((value, key) => {
  //   console.log(`${key} = ${value}`);
  // });

  // create a goal and exe
  const session = (await auth()) || null;
  const caller = appRouter.createCaller({
    session,
    db: prisma,
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
    additional_input: {},
  };

  request.headers.delete("Content-Type");
  const headers = new Headers();
  // request.headers.forEach((value, key) => {
  //   if (key.toLowerCase() !== "content-type") {
  //     headers.set(key, value);
  //     console.log(`${key} = ${value}`);
  //   }
  // });

  const response = Response.json(task, { status: 201, headers });
  response.headers.delete("Content-Type");
  response.headers.forEach((_value, key) => {
    response.headers.delete(key);
  });
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  return response;
}

// GET /ap/v1/agent/tasks
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pageSize = Number(params.get("page_size") ?? 10);
  const currentPage = Number(params.get("current_page") ?? 1);
  const session = (await auth()) || null;
  const caller = appRouter.createCaller({
    session,
    db: prisma,
    origin: request.nextUrl.origin,
  });

  // let nodes: DraftExecutionNode[];
  let exes: ({ goal: Goal } & ExecutionPlusGraph)[];
  try {
    exes = await caller.execution.topByUser({ currentPage, pageSize });
    // nodes = exe?.graph?.nodes ?? [];
  } catch {
    // nodes = [];
    exes = [];
  }
  // remove the first node if its id matches rootPlanId
  // if (nodes[0]?.id === rootPlanId) {
  // nodes.shift();
  // }
  const totalItems = exes.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (currentPage - 1) * pageSize;

  const paginatedTasks = exes.slice(offset, offset + pageSize);

  const pagination = {
    total_items: totalItems,
    total_pages: totalPages,
    current_page: currentPage,
    page_size: pageSize,
  };

  const tasks: Task[] = paginatedTasks.map((task) => ({
    task_id: task.id,
    input: task.goal.prompt,
    artifacts:
      task.results?.map((r) => ({
        artifact_id: r.id,
        agent_created: true,
        file_name: r.id,
        relative_path: r.artifactUrls[0] || null,
        created_at: r.createdAt.toISOString(),
      })) ?? [],
  }));

  return Response.json({ tasks, pagination });
}
