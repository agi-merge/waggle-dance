// pages/api/agent/execute.ts

import { isAbortError } from "next/dist/server/pipe-readable";
import { type NextRequest } from "next/server";
import { type Document } from "langchain/document";
import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";
import { type JsonObject } from "langchain/tools";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { stringify } from "yaml";

import createNamespace from "@acme/agent/src/memory/namespace";
import { LLM, type AgentPromptingMethod } from "@acme/agent/src/utils/llms";
import { type CreateResultParams } from "@acme/api/src/router/result";
import {
  type DraftExecutionGraph,
  type DraftExecutionNode,
  type ExecutionState,
} from "@acme/db";

import { type ExecuteRequestBody } from "~/features/WaggleDance/types/types";
import {
  callExecutionAgent,
  createEmbeddings,
  type AgentPacket,
  type ModelCreationProps,
  type TaskState,
} from "../../../../../../packages/agent";
import { createCallbacks, type CreateCallbackParams } from "./executeCallbacks";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

const REPETITION_CHECK_WINDOW = 45;
const REPETITION_CHECK_EVERY_N_PACKETS = 2;
const maxLogSize = 4096;

const embeddedings = createEmbeddings({ modelName: LLM.embeddings });

const checkRepetitivePackets = async (
  taskId: string,
  recentPackets: AgentPacket[],
  historicalPackets: AgentPacket[],
): Promise<{ recent: string; similarDocuments: Document[] } | null> => {
  // Convert agent packets to documents and add to the vector store
  const recentDocuments = recentPackets.map(packetToDocument);
  const historicalDocuments = historicalPackets
    .map(packetToDocument)
    // Only check the last n historical documents, this helps prevent too much token usage
    .slice(-1 * REPETITION_CHECK_WINDOW);

  try {
    const memoryVectorStore = await MemoryVectorStore.fromTexts(
      [...historicalDocuments],
      [],
      embeddedings,
    );

    const retriever = ScoreThresholdRetriever.fromVectorStore(
      memoryVectorStore,
      {
        minSimilarityScore: 0.9995, // Finds results with at least this similarity score
        maxK: 2,
      },
    );

    // Check each recent document for similar historical documents
    for (const recentDocument of recentDocuments) {
      const similarDocuments =
        await retriever.getRelevantDocuments(recentDocument);
      if (similarDocuments.length > 1) {
        return { recent: recentDocument, similarDocuments }; // Found a recent document with more than one very similar historical document
      }
    }
  } catch (e) {
    console.error(String(e).slice(0, maxLogSize));
    // throw e;
  }

  return null;
};

const packetToDocument = (packet: AgentPacket): string => {
  const p = { ...packet };
  // remove runId and parentRunId from the packet before stringifying
  // we do not want these to be considered when checking for repetitive actions
  Object.defineProperty(p, "runId", { value: undefined, writable: true });
  Object.defineProperty(p, "parentRunId", {
    value: undefined,
    writable: true,
  });

  // Concatenate the start and end slices to form the final string
  // This will give us N/2 characters from the start and N/2 from the end, unless the string length is less than N, in which case the entire thing is returned
  const sample = 500;
  const halfSample = Math.ceil(sample / 2);
  // Convert the packet to a string
  const str = JSON.stringify(p);

  // Calculate half of the string length
  const halfLength = Math.ceil(str.length / 2);

  // If the string is less than or equal to 500 characters, return it as is
  if (str.length <= sample) {
    return str;
  }

  const start = str.slice(0, Math.min(halfSample, halfLength));
  const end = str.slice(-Math.min(halfSample, halfLength));

  return start + end;
};
export default async function ExecuteStream(req: NextRequest) {
  let executionResult:
    | { packet: AgentPacket; state: ExecutionState }
    | undefined;
  let goalId: string | undefined;
  let executionId: string | undefined;
  let namespace: string | undefined;
  let resolveStreamEnded: () => void;
  let rejectStreamEnded: (reason?: string) => void;
  const streamEndedPromise = new Promise<void>((resolve, reject) => {
    resolveStreamEnded = resolve;
    rejectStreamEnded = reject;
  });
  const abortControllerWrapper = { controller: new AbortController() };
  let node: DraftExecutionNode | undefined;
  let repetitionCheckPacketBuffer: AgentPacket[] = [];
  const recentPacketsBuffer: AgentPacket[] = [];
  let allSentPackets: AgentPacket[] = [];
  let repetitionErrorThrown = false;
  // Initialize a counter for packets and a timestamp for time checks
  let packetCounter = 0;
  const handlePacket = async (
    packet: AgentPacket,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder,
    creationProps: ModelCreationProps,
    goalPrompt: string,
    parsedGoalId: string,
    agentPromptingMethod: AgentPromptingMethod,
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
    revieweeTaskResults: TaskState[],
    contentType: "application/json" | "application/yaml",
    abortController: AbortController,
    namespace: string,
    req: NextRequest,
    lastToolInputs?: Map<string, string>,
  ) => {
    // special case to attach the tool input to all tool start packets, regardless of origin
    if (packet.type === "handleToolStart") {
      if (!lastToolInputs) {
        throw new Error(
          "handlePacket(handleToolStart) must be called with lastToolInputs",
        );
      }
      // Store the last tool input for this run
      lastToolInputs.set(packet.runId, packet.input);
    }

    if (!abortController.signal.aborted) {
      // Enqueue the packet to the stream
      controller.enqueue(encoder.encode(stringify([packet])));
    }

    // Push the packet to the packets array
    // make sure to do this last!
    allSentPackets.push(packet);
    repetitionCheckPacketBuffer.push(packet);
    // Increment the packet counter
    packetCounter++;

    // Check if the packet counter has reached N or if the elapsed time has reached M milliseconds
    if (packetCounter >= REPETITION_CHECK_EVERY_N_PACKETS) {
      // Reset the packet counter and the timestamp
      packetCounter = 0;

      if (process.env.EXE_REPETITION_CHECK === "true") {
        try {
          // Perform the repetition check
          const repetitionCheckResult = await checkRepetitivePackets(
            task.id,
            repetitionCheckPacketBuffer,
            recentPacketsBuffer,
          );
          recentPacketsBuffer.push(...repetitionCheckPacketBuffer);
          repetitionCheckPacketBuffer = [];
          if (!!repetitionCheckResult) {
            if (repetitionErrorThrown) {
              throw new Error("Repetition error already thrown");
            }
            repetitionErrorThrown = true;

            const repetitionError: AgentPacket = {
              type: "error",
              severity: "warn",
              error: `RepetitionError: there will be an automatic recovery for this soon.\n ${repetitionCheckResult.similarDocuments.map(
                (doc) => `${doc.pageContent}`,
              )}`,
              ...repetitionCheckResult,
            };

            await handlePacket(
              repetitionError,
              controller,
              encoder,
              creationProps,
              goalPrompt,
              parsedGoalId,
              agentPromptingMethod,
              task,
              dag,
              revieweeTaskResults,
              contentType,
              abortController,
              namespace,
              req,
              lastToolInputs,
            );

            throw repetitionError;
            // await restartExecution(
            //   controller,
            //   repetitionCheckResult.recent,
            //   repetitionCheckResult.similarDocuments,
            //   creationProps,
            //   goalPrompt,
            //   parsedGoalId,
            //   agentPromptingMethod,
            //   task,
            //   dag,
            //   revieweeTaskResults,
            //   contentType,
            //   namespace,
            //   req,
            //   encoder,
            //   resolveStreamEnded,
            // );

            return;
          }
        } catch (e) {
          console.error(String(e).slice(0, maxLogSize));
          if (!abortController.signal.aborted) {
            abortController.abort();
          }
          throw e;
        }
      }
    }
  };

  // FIXME: this does not work yet, it was causing runaway executions and unreported errors
  const _restartExecution = async (
    controller: ReadableStreamDefaultController,
    recentDocument: string,
    similarDocuments: Document[],
    creationProps: ModelCreationProps,
    goalPrompt: string,
    parsedGoalId: string,
    parsedExecutionId: string,
    agentPromptingMethod: AgentPromptingMethod,
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
    revieweeTaskResults: TaskState[],
    contentType: "application/json" | "application/yaml",
    namespace: string,
    agentProtocolOpenAPISpec: JsonObject | undefined,
    req: NextRequest,
    encoder: TextEncoder,
    resolveStreamEnded: () => void,
  ): Promise<void> => {
    console.warn(
      `Repetition detected. Restarting execution. Recent document: ${recentDocument}. Similar documents: ${similarDocuments.map(
        (d) => d.pageContent.slice(500),
      )}`,
    );
    if (abortControllerWrapper.controller.signal.aborted) {
      console.error("restartExecution should not be called after aborting");
      return;
    }
    controller.close();
    repetitionCheckPacketBuffer = [];
    allSentPackets = [];
    packetCounter = 0;
    abortControllerWrapper.controller = new AbortController();

    await streamEndedPromise;

    await startExecution(
      controller,
      creationProps,
      goalPrompt,
      parsedGoalId,
      parsedExecutionId,
      agentPromptingMethod,
      task,
      dag,
      revieweeTaskResults,
      contentType,
      namespace,
      agentProtocolOpenAPISpec,
      req,
      encoder,
      resolveStreamEnded,
    );
  };

  const startExecution = async (
    controller: ReadableStreamDefaultController,
    creationProps: ModelCreationProps,
    goalPrompt: string,
    parsedGoalId: string,
    parsedExecutionId: string,
    agentPromptingMethod: AgentPromptingMethod,
    task: DraftExecutionNode,
    dag: DraftExecutionGraph | null,
    revieweeTaskResults: TaskState[],
    contentType: "application/json" | "application/yaml",
    namespace: string,
    agentProtocolOpenAPISpec: JsonObject | undefined,
    req: NextRequest,
    encoder: TextEncoder,
    resolveStreamEnded: () => void,
  ) => {
    const lastToolInputs = new Map<string, string>();

    const exeResult = await callExecutionAgent({
      creationProps,
      goalPrompt,
      goalId: parsedGoalId,
      executionId: parsedExecutionId,
      agentPromptingMethod,
      task: stringify(task),
      dag: stringify(dag),
      revieweeTaskResults,
      contentType,
      abortSignal: abortControllerWrapper.controller.signal,
      namespace: namespace,
      lastToolInputs,
      handlePacketCallback: async (packet: AgentPacket) => {
        await handlePacket(
          packet,
          controller,
          encoder,
          creationProps,
          goalPrompt,
          parsedGoalId,
          agentPromptingMethod,
          task,
          dag!,
          revieweeTaskResults,
          contentType,
          abortControllerWrapper.controller,
          namespace,
          req,
          lastToolInputs,
        );
      },
      agentProtocolOpenAPISpec,
      geo: req.geo,
    });

    let state: string;
    let packet: AgentPacket;
    if (isAbortError(exeResult)) {
      state = "CANCELLED";
      packet = {
        type: "error",
        severity: "fatal",
        error: "Cancelled",
      };
    } else if (exeResult instanceof Error) {
      state = "ERROR";
      packet = {
        type: "error",
        severity: "fatal",
        error: exeResult.message,
      };
    } else {
      state =
        dag?.nodes[dag.nodes.length - 1]?.id == task.id ? "DONE" : "EXECUTING";
      packet = { type: "done", value: exeResult };
    }
    executionResult = { packet, state: state as ExecutionState };
    controller.enqueue(encoder.encode(stringify([packet])));

    try {
      controller.close();
    } catch {
      // intentionally left blank
    } finally {
      resolveStreamEnded();
    }
  };

  try {
    const {
      creationProps,
      goalPrompt,
      goalId: parsedGoalId,
      executionId: parsedExecutionId,
      task,
      agentPromptingMethod,
      dag,
      agentProtocolOpenAPISpec,
      revieweeTaskResults,
    } = (await req.json()) as ExecuteRequestBody;
    node = task;
    goalId = parsedGoalId;
    executionId = parsedExecutionId;
    namespace = createNamespace({ goalId, executionId });

    const encoder = new TextEncoder();
    // helps augment tool errors and ends so that they do not trigger error handlers for different inputs
    const lastToolInputs = new Map<string, string>();
    const stream = new ReadableStream({
      async start(controller) {
        const contentType = "application/yaml"; // FIXME: this should be configurable

        const params: CreateCallbackParams = {
          controller,
          encoder,
          creationProps,
          goalPrompt,
          parsedGoalId,
          agentPromptingMethod,
          task,
          dag,
          revieweeTaskResults,
          contentType,
          abortController: abortControllerWrapper.controller,
          namespace: namespace!,
          req,
          lastToolInputs,
        };

        creationProps.callbacks = createCallbacks(handlePacket, params);

        await startExecution(
          controller,
          creationProps,
          goalPrompt,
          parsedGoalId,
          parsedExecutionId,
          agentPromptingMethod,
          task,
          dag,
          revieweeTaskResults,
          contentType,
          namespace!,
          agentProtocolOpenAPISpec,
          req,
          encoder,
          resolveStreamEnded,
        );
      },

      cancel(reason) {
        if (abortControllerWrapper.controller.signal.aborted) {
          console.warn("already aborted", reason);
        } else {
          abortControllerWrapper.controller.abort(`cancelled: ${reason}`);
        }
        console.warn("cancel execute request");
        rejectStreamEnded("Stream cancelled");
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    let errorPacket: AgentPacket;
    if (e instanceof Error) {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: stringify(e),
      };
    } else if (e as AgentPacket) {
      // unwrap if possible
      errorPacket = e as AgentPacket;
    } else if (typeof e === "string") {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: e,
      };
    } else {
      // unknown
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: stringify(e),
      };
    }
    executionResult = { packet: errorPacket, state: "ERROR" };
    console.error("execute error", String(e).slice(0, maxLogSize));

    let status = 500;
    if (e as { status: number }) {
      status = (e as { status: number }).status;
    }

    return new Response(stringify([errorPacket]), {
      headers: {
        "Content-Type": "application/yaml",
      },
      status,
    });
  } finally {
    // wrap this because otherwise streaming is broken due to finally being run, and awaiting, before the return stream.
    void (async () => {
      await streamEndedPromise;

      if (!executionResult) {
        // TODO: save a new error for this case?
        return console.error("no execution result");
      }
      const { packet, state } = executionResult;
      allSentPackets.push(packet);
      let response:
        | Response
        | { ok: boolean; status: number; statusText: string };
      if (goalId && executionId && state && node) {
        const createResultParams: CreateResultParams = {
          goalId,
          node,
          executionId,
          packet,
          packets: allSentPackets,
          state,
          origin: req.nextUrl.origin,
        };

        const createResultPromise = fetch(`${req.nextUrl.origin}/api/result`, {
          method: "POST",
          headers: {
            Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createResultParams),
        });
        const [createResultResponse] = await Promise.all([createResultPromise]);
        response = createResultResponse;
      } else {
        response = {
          ok: false,
          status: 500,
          statusText: "!(goalId && executionId && state)",
        };
      }

      if (!response.ok && response.status !== 401) {
        const error = new Error(
          `Could not save result: ${response.statusText}`,
        );
        const errorPacket: AgentPacket = {
          type: "error",
          severity: "fatal",
          error: error.message,
        };
        return new Response(stringify([errorPacket]), {
          headers: {
            "Content-Type": "application/yaml",
          },
          status: 500,
        });
      }
    })();
  }
}
