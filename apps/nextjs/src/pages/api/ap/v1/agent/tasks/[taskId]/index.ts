// api/ap/v1/agent/[...taskId].ts

import { NextResponse, type NextRequest } from "next/server";

import { stub } from "~/utils/stub";

export const config = {
  runtime: "edge",
};

// GET /ap/v1/agent/tasks/:taskId
export const getTask = async (taskId: string) => {
  const task = stub.tasks[taskId];
  if (!task) {
    return NextResponse.json(
      { message: "Unable to find entity with the provided id" },
      { status: 404 },
    );
  }
  return NextResponse.json(task);
};

export default async function handler(req: NextRequest) {
  switch (req.method) {
    case "GET":
      const { searchParams } = new URL(req.url);
      const taskId = searchParams.get("taskId");
      if (taskId) {
        return getTask(taskId);
      }
    // warning: falls through to default case
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
