import { NextResponse, type NextRequest } from "next/server";
import {
  StepStatus,
  type StepRequestBody,
  type Task,
} from "lib/AgentProtocol/types";
import { v4 } from "uuid";

import { stub } from "~/utils/stub";

// POST /ap/v1/agent/tasks/:taskId/steps
export async function POST(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  const body = (await request.json()) as StepRequestBody;

  const task: Task | undefined = stub.tasks[taskId];
  if (!task) {
    return NextResponse.json(
      { message: "Unable to find task with the provided id" },
      { status: 404 },
    );
  }

  const step = {
    step_id: v4(),
    task_id: taskId,
    artifacts: [],
    input: body.input,
    status: StepStatus.CREATED,
    is_last: false,
  };

  stub.steps[step.step_id] = step;
  return NextResponse.json(step, { status: 200 });
}

// GET /ap/v1/agent/tasks/:taskId/steps
export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  const currentPage =
    Number(request.nextUrl.searchParams.get("current_page")) || 1;
  const pageSize = Number(request.nextUrl.searchParams.get("page_size")) || 10;

  const taskSteps = Object.values(stub.steps).filter(
    (step) => step.task_id === taskId,
  );
  const totalItems = taskSteps.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const offset = (currentPage - 1) * pageSize;

  const paginatedSteps = taskSteps.slice(offset, offset + pageSize);

  const pagination = {
    total_items: totalItems,
    total_pages: totalPages,
    current_page: currentPage,
    page_size: pageSize,
  };

  return NextResponse.json({ steps: paginatedSteps, pagination });
}
