// features/WaggleDance/utils/planTasks.ts

import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import {
  initialNodes,
  rootPlanId,
  type AgentPacket,
  type ModelCreationProps,
} from "../../../../../../packages/agent";
import { type GraphDataState } from "../types/types";
import { type InjectAgentPacketType } from "../types/WaggleDanceAgentExecutor";
import PlanUpdateIntervalHandler from "./PlanUpdateIntervalHandler";
import { sleep } from "./sleep";

export type PlanTasksProps = {
  goal: string;
  goalId: string;
  executionId: string;
  creationProps: ModelCreationProps;
  graphDataState: GraphDataState;
  log: (...args: (string | number | object)[]) => void;
  injectAgentPacket: InjectAgentPacketType;
  abortSignal: AbortSignal;
  startFirstTask?: (
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
  ) => Promise<void>;
};

export default async function planTasks({
  goal,
  goalId,
  executionId,
  creationProps,
  graphDataState: [dag, setDAG],
  log,
  injectAgentPacket,
  startFirstTask,
  abortSignal,
}: PlanTasksProps): Promise<DraftExecutionGraph | undefined> {
  const intervalHandler = new PlanUpdateIntervalHandler(100); // update at most every...
  const parseWorker = new Worker(new URL("./parseWorker.ts", import.meta.url));

  try {
    // FIXME: we could change to non-draft return type if we return the DB draft from the backend
    injectAgentPacket({ type: "starting", nodeId: rootPlanId }, dag.nodes[0]!);

    let partialDAG: DraftExecutionGraph = dag;
    let hasFirstTaskStarted = false;
    const data = { goal, goalId, executionId, creationProps };
    const res = await fetch("/api/agent/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: abortSignal,
    });

    if (!res.ok) {
      console.error(`Error fetching plan: ${res.status} ${res.statusText}`);
      throw new Error(`Error fetching plan: ${res.status} ${res.statusText}`);
    }
    const stream = res.body;
    let initialNode: DraftExecutionNode | undefined;
    if (!stream) {
      throw new Error(`No stream: ${res.statusText} `);
    } else {
      log(`started planning!`);
      initialNode = initialNodes(goal)[0];
      if (initialNode) {
        injectAgentPacket({ type: "working", nodeId: rootPlanId }, initialNode);
      } else {
        log({ type: "error", nodeId: rootPlanId, message: "No initial node" });
        throw new Error("No initial node");
      }
    }

    intervalHandler.start(setDAG, goal);

    let postMessageCount = 0;

    parseWorker.postMessage({
      goal,
      executionId,
      initialNodes: initialNodes(goal),
    });

    parseWorker.onerror = function (event) {
      console.error("parseWorker error", event);
      postMessageCount--;
    };
    parseWorker.onmessageerror = function (event) {
      console.error("parseWorker onmessageerror", event);
      postMessageCount--;
    };
    parseWorker.onmessage = function (
      event: MessageEvent<{
        dag: DraftExecutionGraph | null | undefined;
        error: Error | undefined;
        finishPacket: AgentPacket | undefined;
      }>,
    ) {
      postMessageCount--;
      const { dag: newDag, error, finishPacket } = event.data;

      if (!!finishPacket) {
        injectAgentPacket(finishPacket, initialNode!);
        return;
      }

      if (!!error) {
        return;
      }

      if (newDag) {
        intervalHandler.updateDAG(newDag);
        partialDAG = newDag;
        // if we have an edges array, we should start the first task. additionally, if there are more than two nodes, we should start the first task
        // this ensures that single-node/zero-edge plans start the first task and that multi-node plans start the first task
        const firstNode = newDag.nodes[1];
        if (
          !hasFirstTaskStarted &&
          startFirstTask &&
          firstNode &&
          (newDag.edges.length || newDag.nodes.length > 2)
        ) {
          hasFirstTaskStarted = true;
          console.log("starting first task", firstNode.id);
          void startFirstTask(firstNode, dag);
        }
      }
    };

    let buffer = Buffer.alloc(0);
    async function streamToString(stream: ReadableStream<Uint8Array>) {
      const decoder = new TextDecoder();
      const transformStream = new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          controller.enqueue(decoder.decode(chunk));
        },
      });

      const readableStream = stream.pipeThrough(transformStream);
      const reader = readableStream.getReader();

      let result;
      while ((result = await reader.read()) && result.value) {
        if (abortSignal.aborted) {
          throw new Error("Signal aborted");
        }
        const newData = Buffer.from(result.value);
        const lineBreakIndex = newData.lastIndexOf("\n");

        if (lineBreakIndex !== -1) {
          const completeLine = newData.subarray(0, lineBreakIndex + 1);
          const partialLine = newData.subarray(lineBreakIndex + 1);

          buffer = Buffer.concat([buffer, completeLine]);
          postMessageCount++;
          parseWorker.postMessage({ buffer: buffer.toString(), goal });
          buffer = partialLine;
        } else {
          buffer = Buffer.concat([buffer, newData]);
        }
      }

      if (buffer.length > 0) {
        postMessageCount++;
        parseWorker.postMessage({ buffer: buffer.toString(), goal });
      }

      while (postMessageCount > 0) {
        await sleep(100);
      }
    }

    await streamToString(stream);
    return partialDAG;
  } catch (error) {
    // log and rethrow
    console.error(error);
    throw error;
  } finally {
    intervalHandler.stop();
  }
}
