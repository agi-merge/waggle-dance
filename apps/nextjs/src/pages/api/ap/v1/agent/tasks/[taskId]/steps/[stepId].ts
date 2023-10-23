// apps/nextjs/src/pages/api/ap/v1/agent/tasks/[taskId]/steps/[stepId].ts

import { NextResponse, type NextRequest } from "next/server";
import { type Step } from "lib/AgentProtocol/types";

import { stub } from "~/utils/stub";

export const config = {
  runtime: "edge",
};

// GET /ap/v1/agent/tasks/:taskId/steps/:stepId
export const getStep = (taskId: string, stepId: string) => {
  const step: Step | undefined = stub.steps[stepId];
  if (!step) {
    return NextResponse.json(
      { message: "Unable to find step with the provided id" },
      { status: 404 },
    );
  }
  return NextResponse.json(step);
};

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const stepId = searchParams.get("stepId");
  if (!taskId || !stepId) {
    return NextResponse.json(
      { message: "Task ID or Step ID not found" },
      { status: 404 },
    );
  }
  switch (req.method) {
    case "GET":
      return getStep(taskId, stepId);
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
