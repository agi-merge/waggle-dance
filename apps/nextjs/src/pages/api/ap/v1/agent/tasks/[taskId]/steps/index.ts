import { NextResponse, type NextRequest } from "next/server";
import {
  StepStatus,
  type StepRequestBody,
  type Task,
} from "lib/AgentProtocol/types";
import { v4 } from "uuid";

import { stub } from "~/utils/stub";

export const config = {
  runtime: "edge",
};

// POST /ap/v1/agent/tasks/:taskId/steps
export const executeStep = (taskId: string, body: StepRequestBody) => {
  const task: Task | undefined = stub.tasks[taskId];
  if (!task) {
    // add task
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
};

// GET /ap/v1/agent/tasks/:taskId/steps
export const listSteps = async (req: NextRequest, taskId: string) => {
  const { searchParams } = new URL(req.url);
  const currentPage = Number(searchParams.get("current_page")) || 1;
  const pageSize = Number(searchParams.get("page_size")) || 10;

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
};

export default async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const taskId = searchParams.get("taskId");
  if (!taskId) {
    return Response.json(
      {
        message: "Steps cannot be returned because the task ID does not exist",
      },
      { status: 404 },
    );
  }
  if (!stub.tasks[taskId]) {
    return Response.json(
      { message: "Steps for the given task ID not found" },
      { status: 404 },
    );
  }
  switch (req.method) {
    case "POST":
      const reqBody = (await req.json()) as StepRequestBody;
      return executeStep(taskId, reqBody);
    case "GET":
      return listSteps(req, taskId);
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
