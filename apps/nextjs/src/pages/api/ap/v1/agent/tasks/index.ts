// api/ap/v1/agent/tasks/index.ts

import { NextResponse, type NextRequest } from "next/server";
import { v4, type TaskRequestBody } from "lib/AgentProtocol/types";

import { stub } from "~/utils/stub";

export const config = {
  runtime: "edge",
};

// POST /ap/v1/agent/tasks
export const createTask = (body: TaskRequestBody) => {
  const task = {
    task_id: v4(),
    artifacts: [],
    input: body.input,
  };
  stub.tasks[task.task_id] = task;
  return NextResponse.json(task, { status: 200 });
};

// GET /ap/v1/agent/tasks
export const listTasks = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const currentPage = Number(searchParams.get("current_page")) || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;

  const totalItems = Object.keys(stub.tasks).length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (currentPage - 1) * pageSize;

  const paginatedTasks = Object.values(stub.tasks).slice(
    offset,
    offset + pageSize,
  );

  const pagination = {
    total_items: totalItems,
    total_pages: totalPages,
    current_page: currentPage,
    page_size: pageSize,
  };

  return NextResponse.json({ tasks: paginatedTasks, pagination });
};

// GET /ap/v1/agent/tasks/:taskId
export const getTask = async (taskId: string) => {
  const task = stub.tasks[taskId];
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
};

export default async function handler(req: NextRequest) {
  switch (req.method) {
    case "POST":
      const reqBody = (await req.json()) as TaskRequestBody;
      return createTask(reqBody);
    case "GET":
      return listTasks(req);
    default:
      const status = 405;
      return new Response("Method Not Allowed", {
        headers: {
          "Content-Type": "application/text",
        },
        status,
      });
  }
}
