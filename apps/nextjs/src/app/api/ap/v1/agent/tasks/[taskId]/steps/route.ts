import { NextResponse, type NextRequest } from "next/server";
import {
  type Artifact,
  type Step,
  type StepRequestBody,
  type StepStatus,
} from "lib/AgentProtocol/types";
import { getServerSession } from "next-auth";
import { parse } from "yaml";

import {
  findFinishPacket,
  getMostRelevantOutput,
  type AgentPacket,
} from "@acme/agent";
import { AgentPromptingMethod, LLM_ALIASES } from "@acme/agent/src/utils/llms";
import { appRouter } from "@acme/api";
import { authOptions } from "@acme/auth";
import { prisma, type DraftExecutionNode } from "@acme/db";

import { type ExecuteRequestBody } from "~/features/WaggleDance/types/types";
import { uploadAndSaveResult } from "../artifacts/route";

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

  // if (!body.input) {
  //   return Response.json({ message: "Input is required" }, { status: 400 });
  // }

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
  const goal = await caller.goal.byId(exe.goalId);

  const latestResult = exe.results.length > 0 ? exe.results[0] : null;
  exe.graph?.nodes.shift();
  const latestResultNode =
    exe.graph?.nodes.find((n) => n.id === latestResult?.nodeId) ||
    exe.graph?.nodes.length
      ? exe.graph?.nodes[0]
      : null;
  const node: DraftExecutionNode = {
    id: latestResultNode?.id || taskId,
    name: latestResultNode?.name || latestResultNode?.context || "error",
    graphId: exe.graph?.id,
    context: latestResultNode?.context || null,
  };
  // const completedTasks = exe.results.length;

  // const task: DraftExecutionNode = {
  //   id: completedTasks.toString(),
  //   name: body.input as string,
  //   graphId: exe.graph?.id,
  //   context: null,
  // };
  const input = {
    //   executionId: string;
    // task: DraftExecutionNode;
    // revieweeTaskResults: TaskState[];
    // dag: DraftExecutionGraph;
    // agentPromptingMethod: AgentPromptingMethod;
    executionId: taskId,
    task: node,
    goalId: exe.goalId,
    dag: exe.graph,
    revieweeTaskResults: [],
    agentPromptingMethod: AgentPromptingMethod.OpenAIStructuredChat,
    goalPrompt: goal?.prompt || "error",
    creationProps: { modelName: LLM_ALIASES["fast"], maxTokens: 350 },
  } as ExecuteRequestBody;

  const executeResponse = await fetch(
    `${request.nextUrl.origin}/api/agent/execute`,
    {
      method: "POST",
      headers: {
        Cookie: request.headers.get("cookie") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: request.signal,
    },
  );

  const executeResponseText = await executeResponse.text();

  const packets = parse(executeResponseText) as AgentPacket[];

  const finishPacket = findFinishPacket(packets);

  // upload artifact

  const contentType = request.headers.get("content-type") || "";
  // const file = await request.blob();

  const output = getMostRelevantOutput(finishPacket).output;
  const { artifact, result } = await uploadAndSaveResult({
    file: executeResponseText,
    executionId: exe.id,
    nodeId: latestResultNode?.id,
    contentType,
    origin: request.nextUrl.origin,
  });
  const refreshedExe = await caller.execution.byId({ id: taskId });
  const refreshedNode = refreshedExe?.graph?.nodes.find(
    (n) => n.id === result.nodeId,
  );

  const responseObject = {
    input: body.input,
    additional_input: {}, // Update this based on your logic
    task_id: taskId,
    step_id: refreshedNode?.id,
    name: refreshedNode?.name,
    status:
      result.packets.length === 0
        ? "created"
        : result.value
        ? "completed"
        : "running", // Update this based on your logic
    output, // Update this based on your logic
    // additional_output: { packets }, // Update this based on your logic

    // export type Artifact = {
    //   artifact_id: string;
    //   agent_created: boolean;
    //   file_name: string;
    //   relative_path: string | null;
    //   created_at: string;
    // };
    artifacts: [artifact], // Update this based on your logic
    is_last: exe.graph?.nodes.length
      ? exe.graph.nodes[exe.graph.nodes.length - 1]?.id === node.id
      : false, // Update this based on your logic
  };

  request.headers.delete("Content-Type");
  request.headers.delete("Content-Type");
  const headers = new Headers();
  const response = Response.json(responseObject, { status: 200, headers });
  response.headers.delete("Content-Type");
  response.headers.forEach((_value, key) => {
    response.headers.delete(key);
  });
  // response.headers.set("Content-Type", "application/json; charset=utf-8");

  return response;
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
  execution?.graph?.nodes.shift();
  const steps = execution?.graph?.nodes.map((node, i) => {
    const resultForStep = results?.find((r) => r.nodeId === node.id);
    const artifactFromResult = JSON.stringify(resultForStep?.value);
    const isLast = i === (execution?.graph?.nodes.length ?? 0) - 1;
    const status = resultForStep?.value
      ? "completed"
      : resultForStep?.packets.length ?? 0 > 0
      ? "running"
      : "created";
    const artifact: Artifact | null =
      status === "completed"
        ? {
            artifact_id: resultForStep?.id || node.id,
            agent_created: true,
            file_name: resultForStep?.artifactUrls[0] ?? "error",
            relative_path: null,
            created_at:
              resultForStep?.createdAt.toISOString() ??
              new Date().toISOString(),
          }
        : null;
    const step: Step = {
      name: node.name,
      input: node.context || node.name,
      output: artifactFromResult,
      artifacts: (artifact && [artifact]) || [],
      is_last: isLast,
      task_id: taskId,
      step_id: node.id,
      status: status as StepStatus,
    };

    return step;
  });

  // Define pagination object
  const pagination = {
    total_items: steps?.length || 0,
    total_pages: 1, // Update this based on your pagination logic
    current_page: 1, // Update this based on your pagination logic
    page_size: steps?.length || 0, // Update this based on your pagination logic
  };

  request.headers.delete("Content-Type");
  request.headers.delete("Content-Type");
  const headers = new Headers();
  // request.headers.forEach((value, key) => {
  //   if (key.toLowerCase() !== "content-type") {
  //     headers.set(key, value);
  //     console.log(`${key} = ${value}`);
  //   }
  // });

  const response = Response.json(
    { steps, pagination },
    { status: 200, headers },
  );
  response.headers.delete("Content-Type");
  response.headers.forEach((_value, key) => {
    response.headers.delete(key);
  });
  // response.headers.set("Content-Type", "application/json; charset=utf-8");

  return response;
}
