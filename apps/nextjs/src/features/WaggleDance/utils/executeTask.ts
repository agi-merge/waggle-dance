import { parse, stringify } from "yaml";

import { type ChainPacket } from "@acme/chain";

import { type ExecuteRequestBody } from "~/pages/api/chain/types";
import { type DAGNode, type DAGNodeClass } from "../DAG";
import { readResponseStream } from "./readResponseStream";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTaskData(
  request: ExecuteRequestBody,
  task: DAGNode,
  abortSignal: AbortSignal,
): Promise<Response> {
  const data = { ...request, task, dag: request.dag };
  const response = await fetch("/api/chain/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: abortSignal,
  });

  return response;
}

function processResponseBuffer(task: DAGNode, buffer: Buffer): ChainPacket {
  const packets = parse(buffer.toString()) as ChainPacket[];
  const packet = packets.findLast(
    (packet) =>
      packet.type === "handleAgentEnd" ||
      packet.type === "done" ||
      packet.type === "error" ||
      packet.type === "handleChainError" ||
      packet.type === "handleToolError" ||
      packet.type === "handleLLMError",
  );

  if (!packet) {
    throw new Error("No exe result packet found");
  }

  return packet;
}

export default async function executeTask(
  request: ExecuteRequestBody,
  _maxConcurrency: number,
  _isRunning: boolean,
  sendChainPacket: (
    chainPacket: ChainPacket,
    node: DAGNode | DAGNodeClass,
  ) => void,
  log: (...args: (string | number | object)[]) => void,
  abortSignal: AbortSignal,
): Promise<string> {
  const { task } = request;

  if (abortSignal.aborted) throw new Error("Signal aborted");

  log(`About to execute task ${task.id} -${task.name}...`);
  sendChainPacket({ type: "starting", nodeId: task.id }, task);

  const response = await fetchTaskData(request, task, abortSignal);
  const stream = response.body;
  if (!response.ok || !stream) {
    throw new Error(`No stream: ${response.statusText} `);
  }

  sendChainPacket({ type: "working", nodeId: task.id }, task);
  log(`Task ${task.id} -${task.name} stream began!`);

  const buffer = await readResponseStream(stream, abortSignal);
  if (!buffer) {
    throw new Error(`No buffer: ${response.statusText} `);
  }
  const packet = processResponseBuffer(task, buffer);

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
