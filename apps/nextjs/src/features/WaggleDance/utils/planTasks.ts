// features/WaggleDance/utils/planTasks.ts

import { type JsonObject } from "langchain/tools";

import { type DraftExecutionGraph, type DraftExecutionNode } from "@acme/db";

import {
  rootPlanId,
  rootPlanNode,
  type AgentPacket,
  type ModelCreationProps,
} from "../../../../../../packages/agent";
import { type GraphDataState } from "../types/types";
import { type InjectAgentPacketType } from "../types/WaggleDanceAgentExecutor";
import PlanUpdateIntervalHandler from "./PlanUpdateIntervalHandler";
import { sleep } from "./sleep";

export type PlanTasksProps = {
  goalPrompt: string;
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
  agentProtocolOpenAPISpec?: JsonObject;
};

export default async function planTasks({
  goalPrompt,
  goalId,
  executionId,
  creationProps,
  graphDataState: [dag, setDAG],
  log,
  injectAgentPacket,
  startFirstTask,
  abortSignal,
  agentProtocolOpenAPISpec,
}: PlanTasksProps): Promise<DraftExecutionGraph | undefined> {
  const intervalHandler = new PlanUpdateIntervalHandler(100); // update at most every...
  const parsePlanWorker = new Worker(
    new URL("./parsePlanWorker.ts", import.meta.url),
  );

  try {
    // FIXME: we could change to non-draft return type if we return the DB draft from the backend
    injectAgentPacket({ type: "starting", nodeId: rootPlanId }, dag.nodes[0]!);

    let partialDAG: DraftExecutionGraph = dag;
    let hasFirstTaskStarted = false;
    const data = {
      goalPrompt,
      goalId,
      executionId,
      creationProps,
      agentProtocolOpenAPISpec,
    };
    // TODO: merge w/ api.execution.createPlan
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
      initialNode = rootPlanNode(goalPrompt);
      if (initialNode) {
        injectAgentPacket({ type: "working", nodeId: rootPlanId }, initialNode);
      } else {
        log({ type: "error", nodeId: rootPlanId, message: "No initial node" });
        throw new Error("No initial node");
      }
    }

    intervalHandler.start(setDAG, goalPrompt);

    let postMessageCount = 0;

    parsePlanWorker.postMessage({
      goalPrompt,
      executionId,
      initialNodes: rootPlanNode(goalPrompt),
    });

    parsePlanWorker.onerror = function (event) {
      console.error("parsePlanWorker error", event);
      postMessageCount--;
    };
    parsePlanWorker.onmessageerror = function (event) {
      console.error("parsePlanWorker onmessageerror", event);
      postMessageCount--;
    };
    parsePlanWorker.onmessage = function (
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
          void startFirstTask(firstNode, dag);
        }
      }
    };
    let buffer = Buffer.alloc(0);
    let objectStartIndex = 0; // This index will track the start of the current YAML object.

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
      while ((result = await reader.read()) && !result.done) {
        if (abortSignal.aborted) {
          throw new Error("Signal aborted");
        }
        const newData = Buffer.from(result.value);
        buffer = Buffer.concat([buffer, newData]);

        let lastIndex;
        while (
          (lastIndex = buffer
            .toString("utf-8", objectStartIndex)
            .indexOf("\n- ")) !== -1
        ) {
          // Check for abort signal in each iteration
          if (abortSignal.aborted) {
            throw new Error("Signal aborted");
          }
          const completeData = buffer.slice(
            objectStartIndex,
            objectStartIndex + lastIndex,
          );
          postMessageCount++;
          parsePlanWorker.postMessage({
            buffer: completeData.toString(),
            goalPrompt,
          });
          objectStartIndex += lastIndex + 1; // Update the start index to the start of the next YAML object.
        }
      }

      // Handle the last element
      if (objectStartIndex < buffer.length) {
        // If there is still data in the buffer after the last "\n- ", it is the last YAML object.
        const completeData = buffer.slice(objectStartIndex);
        postMessageCount++;
        parsePlanWorker.postMessage({
          buffer: completeData.toString(),
          goalPrompt,
        });
      }

      while (postMessageCount > 0) {
        if (abortSignal.aborted) {
          throw new Error("Signal aborted");
        }
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
