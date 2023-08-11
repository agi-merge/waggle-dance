// features/WaggleDance/utils/executeTask.ts

import { parse, stringify } from "yaml";

import { type ExecuteRequestBody } from "~/pages/api/agent/types";
import { type ChainPacket } from "../../../../../../packages/agent";
import { type DAGNode, type DAGNodeClass } from "../DAG";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTaskData(
  request: ExecuteRequestBody,
  abortSignal: AbortSignal,
): Promise<Response> {
  const response = await fetch("/api/agent/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal: abortSignal,
  });

  return response;
}

function processResponseBuffer(tokens: string): Partial<ChainPacket> {
  const packets = parse(tokens) as Partial<ChainPacket>[];
  const packet = packets.findLast(
    (packet) =>
      packet.type === "handleAgentEnd" ||
      packet.type === "done" ||
      packet.type === "error" ||
      packet.type === "handleChainError" ||
      packet.type === "handleToolError" ||
      packet.type === "handleLLMError",
  ) ?? {
    type: "error",
    severity: "fatal",
    message: "No exe result packet found",
  }; // Use Nullish Coalescing to provide a default value

  return packet;
}

export type ExecuteTaskProps = {
  request: ExecuteRequestBody;
  sendChainPacket: (
    chainPacket: ChainPacket,
    node: DAGNode | DAGNodeClass,
  ) => void;
  log: (...args: (string | number | object)[]) => void;
  abortSignal: AbortSignal;
};

export default async function executeTask({
  request,
  sendChainPacket,
  log,
  abortSignal,
}: ExecuteTaskProps): Promise<string> {
  const { task } = request;

  if (abortSignal.aborted) throw new Error("Signal aborted");

  log(`About to execute task ${task.id} -${task.name}...`);
  sendChainPacket({ type: "starting", nodeId: task.id }, task);

  const response = await fetchTaskData(request, abortSignal);
  const stream = response.body;
  if (!response.ok || !stream) {
    throw new Error(
      `No stream. Response: ${response.statusText}. Is stream locked: ${stream?.locked}`,
    );
  }

  sendChainPacket({ type: "working", nodeId: task.id }, task);
  log(`Task ${task.id} -${task.name} stream began!`);

  let buffer = Buffer.alloc(0);
  let tokens = "";

  const reader = stream.getReader();
  let result;
  while ((result = await reader.read()) && !result.done) {
    if (abortSignal.aborted) {
      throw new Error("Signal aborted");
    }
    const newData = Buffer.from(result.value);
    const lineBreakIndex = newData.lastIndexOf("\n");

    // Only store complete lines in the buffer and parse the partial line
    if (lineBreakIndex !== -1) {
      const completeLine = newData.subarray(0, lineBreakIndex + 1);
      const partialLine = newData.subarray(lineBreakIndex + 1);

      buffer = Buffer.concat([buffer, completeLine]);
      tokens += buffer.toString();
      buffer = partialLine; // Store the remaining partial line in the buffer
    } else {
      buffer = Buffer.concat([buffer, newData]);
    }
  }

  if (!tokens || !tokens.length) {
    throw new Error(
      `No buffered tokens ${tokens} for response ${response.status} result ${result.done} `,
    );
  }
  const packet = processResponseBuffer(tokens);

  if (packet.type === "handleAgentEnd" || packet.type === "done") {
    return stringify(packet.value);
  } else {
    throw new Error(
      `Error retrieving task result ${task.id} -${task.name}: ${stringify(
        packet,
      )}`,
    );
  }
}
