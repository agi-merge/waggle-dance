import { NextResponse, type NextRequest } from "next/server";
import { v4, type TaskRequestBody } from "lib/AgentProtocol/types";

import { stub } from "~/utils/stub";

// POST /ap/v1/agent/tasks
export async function POST(request: NextRequest) {
  const body = (await request.json()) as TaskRequestBody;

  const task = {
    task_id: v4(),
    artifacts: [],
    input: body.input,
  };

  stub.tasks[task.task_id] = task;
  return NextResponse.json(task, { status: 200 });
}

// GET /ap/v1/agent/tasks
export async function GET(request: NextRequest) {
  const currentPage =
    Number(request.nextUrl.searchParams.get("current_page")) || 1;
  const pageSize = Number(request.nextUrl.searchParams.get("page_size")) || 10;

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
}
