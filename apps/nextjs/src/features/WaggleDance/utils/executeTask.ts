// features/WaggleDance/utils/executeTask.ts
import { parse } from "yaml";

import {
  findFinishPacket,
  type AgentPacket,
} from "../../../../../../packages/agent";
import { type InjectAgentPacketType } from "../types/TaskExecutor";
import { type ExecuteRequestBody } from "../types/types";

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

function processResponseBuffer(tokens: string): AgentPacket {
  const packets = parse(tokens) as AgentPacket[];
  const packet = findFinishPacket(packets);

  return packet;
}

export type ExecuteTaskProps = {
  request: ExecuteRequestBody;
  injectAgentPacket: InjectAgentPacketType;
  log: (...args: (string | number | object)[]) => void;
  abortSignal: AbortSignal;
};

export default async function executeTask({
  request,
  injectAgentPacket,
  log,
  abortSignal,
}: ExecuteTaskProps): Promise<AgentPacket> {
  const { task } = request;

  if (abortSignal.aborted) throw new Error("Signal aborted");

  log(`About to execute task ${task.id} -${task.name}...`);
  injectAgentPacket({ type: "starting", nodeId: task.id }, task);

  const response = await fetchTaskData(request, abortSignal);
  const stream = response.body;
  if (!response.ok || !stream) {
    throw new Error(
      `No stream. Response: ${response.statusText}. Is stream locked: ${stream?.locked}`,
    );
  }

  injectAgentPacket({ type: "working", nodeId: task.id }, task);
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

  // If there's still data left in the buffer, add it to the tokens
  if (buffer.length > 0) {
    tokens += buffer.toString();
  }

  if (!tokens || !tokens.length) {
    throw new Error(
      `No buffered tokens ${tokens} for response ${response.status} result ${result.done} `,
    );
  }
  const packet = processResponseBuffer(tokens);

  return packet;
}
