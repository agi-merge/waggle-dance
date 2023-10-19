import { isAbortError } from "next/dist/server/pipe-readable";
import { type NextRequest } from "next/server";
import { BaseCallbackHandler } from "langchain/callbacks";
import { type Document } from "langchain/document";
import { type Serialized } from "langchain/load/serializable";
import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";
import {
  type AgentAction,
  type AgentFinish,
  type ChainValues,
  type LLMResult,
} from "langchain/schema";
// Ephemeral, in-memory vector store for demo purposes
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { parse, stringify } from "yaml";

import createNamespace from "@acme/agent/src/memory/namespace";
import { isTaskCriticism } from "@acme/agent/src/prompts/types";
import saveMemoriesSkill from "@acme/agent/src/skills/saveMemories";
import { LLM, type AgentPromptingMethod } from "@acme/agent/src/utils/llms";
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
import { type CreateResultParams } from "../result";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

/**
 * Returns a hash code from a string
 * @param  {String} str The string to hash.
 * @return {Number}    A 32bit integer
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 * credit: https://stackoverflow.com/a/8831937/127422
 */
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

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
    .slice(-30);

  try {
    const memoryVectorStore = await MemoryVectorStore.fromTexts(
      [...historicalDocuments],
      [],
      embeddedings,
    );

    console.debug(
      `checkRepetitivePackets(${taskId}) len=`,
      memoryVectorStore.memoryVectors.length,
      "",
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
    console.error(e);
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
  let packets: AgentPacket[] = [];
  let historicalPackets: AgentPacket[] = [];

  const CHECK_EVERY_N_PACKETS = 3;

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
    packets.push(packet);

    // Increment the packet counter
    packetCounter++;

    // Check if the packet counter has reached N or if the elapsed time has reached M milliseconds
    if (packetCounter >= CHECK_EVERY_N_PACKETS) {
      // Reset the packet counter and the timestamp
      packetCounter = 0;

      try {
        // Perform the repetition check
        const repetitionCheckResult = await checkRepetitivePackets(
          task.id,
          packets,
          historicalPackets,
        );
        historicalPackets.push(...packets);
        packets = [];
        if (!!repetitionCheckResult) {
          const repetitionError: AgentPacket = {
            type: "error",
            severity: "warn",
            error: `Repetition Error: there will be a automatic recovery for this soon.\n ${repetitionCheckResult.similarDocuments.map(
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
        console.error(e);
        throw e;
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
    agentPromptingMethod: AgentPromptingMethod,
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
    revieweeTaskResults: TaskState[],
    contentType: "application/json" | "application/yaml",
    namespace: string,
    req: NextRequest,
    encoder: TextEncoder,
    resolveStreamEnded: () => void,
  ): Promise<void> => {
    console.warn(
      `Repetition detected. Restarting execution. Recent document: ${recentDocument}. Similar documents: ${similarDocuments.map(
        (d) => d.pageContent,
      )}`,
    );
    if (abortControllerWrapper.controller.signal.aborted) {
      console.error("restartExecution should not be called after aborting");
      return;
    }
    controller.close();
    abortControllerWrapper.controller.signal;
    packets = [];
    historicalPackets = [];
    packetCounter = 0;
    abortControllerWrapper.controller = new AbortController();

    await streamEndedPromise;

    await startExecution(
      controller,
      creationProps,
      goalPrompt,
      parsedGoalId,
      agentPromptingMethod,
      task,
      dag,
      revieweeTaskResults,
      contentType,
      namespace,
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
    agentPromptingMethod: AgentPromptingMethod,
    task: DraftExecutionNode,
    dag: DraftExecutionGraph,
    revieweeTaskResults: TaskState[],
    contentType: "application/json" | "application/yaml",
    namespace: string,
    req: NextRequest,
    encoder: TextEncoder,
    resolveStreamEnded: () => void,
  ) => {
    const exeResult = await callExecutionAgent({
      creationProps,
      goalPrompt,
      goalId: parsedGoalId,
      agentPromptingMethod,
      task: stringify(task),
      dag: stringify(dag),
      revieweeTaskResults,
      contentType,
      abortSignal: abortControllerWrapper.controller.signal,
      namespace: namespace,
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
        dag.nodes[dag.nodes.length - 1]?.id == task.id ? "DONE" : "EXECUTING";
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
      revieweeTaskResults,
    } = (await req.json()) as ExecuteRequestBody;
    node = task;
    goalId = parsedGoalId;
    executionId = parsedExecutionId;
    namespace = createNamespace(goalId, executionId, task);

    const encoder = new TextEncoder();
    // helps augment tool errors and ends so that they do not trigger error handlers for different inputs
    const lastToolInputs = new Map<string, string>();
    const stream = new ReadableStream({
      async start(controller) {
        creationProps.callbacks = [
          BaseCallbackHandler.fromMethods({
            // handleChatModelStart(
            //   llm: Serialized,
            //   messages: BaseMessage[][],
            //   runId: string,
            //   parentRunId?: string,
            //   extraParams?: Record<string, unknown>,
            //   tags?: string[],
            //   metadata?: Record<string, unknown>,
            // ): void | Promise<void> {
            // const packet: AgentPacket = {
            //   type: "handleChatModelStart",
            //   llm,
            //   messages,
            //   runId,
            //   parentRunId,
            //   extraParams,
            //   tags,
            //   metadata,
            // };
            // controller.enqueue(encoder.encode(stringify([packet])));
            // packets.push(packet);
            // },
            handleRetrieverStart(
              retriever: Serialized,
              query: string,
              runId: string,
              parentRunId?: string,
              tags?: string[],
              metadata?: Record<string, unknown>,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleRetrieverStart",
                retriever,
                query,
                runId,
                parentRunId,
                tags,
                metadata,
              };
              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleRetrieverEnd(
              documents: Document[],
              runId: string,
              parentRunId?: string,
              tags?: string[],
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleRetrieverEnd",
                documents,
                runId,
                parentRunId,
                tags,
              };

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleLLMStart(
              llm: Serialized,
              prompts: string[],
              runId: string,
              parentRunId?: string,
              _extraParams?: Record<string, unknown>,
              _tags?: string[],
              _metadata?: Record<string, unknown>,
            ): Promise<void> | void {
              const packet: AgentPacket = {
                type: "handleLLMStart",
                runId,
                parentRunId,
                llmHash: hashCode(JSON.stringify(llm)),
                hash: hashCode(JSON.stringify(prompts)),
              };

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleLLMEnd(
              output: LLMResult,
              runId: string,
              parentRunId?: string,
            ): Promise<void> | void {
              const packet: AgentPacket = {
                type: "handleLLMEnd",
                output,
                runId,
                parentRunId,
              };

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleLLMError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = createErrorPacket(
                "handleLLMError",
                err,
                runId,
                parentRunId,
              );

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
              console.error("handleLLMError", packet);
            },
            handleChainError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = createErrorPacket(
                "handleChainError",
                err,
                runId,
                parentRunId,
              );

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              ); // can be 'Output parser not set'
              console.error("handleChainError", packet);
            },
            handleToolStart(
              tool: Serialized,
              input: string,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleToolStart",
                tool,
                input,
                runId,
                parentRunId,
              };

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
                lastToolInputs, // must be passed to handlePacket to be used in handleToolStart
              );
            },
            handleToolError(
              err: unknown,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket & { lastToolInput?: string } =
                createErrorPacket("handleToolError", err, runId, parentRunId);
              packet.lastToolInput = lastToolInputs.get(runId);

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
              console.error("handleToolError", packet);
            },
            handleToolEnd(
              output: string,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket & { lastToolInput?: string } = {
                type: "handleToolEnd",
                output,
                runId,
                parentRunId,
              };
              packet.lastToolInput = lastToolInputs.get(runId);

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleAgentAction(
              action: AgentAction,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              const packet: AgentPacket = {
                type: "handleAgentAction",
                action,
                runId,
                parentRunId,
              };

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
                lastToolInputs,
              );
            },
            handleRetrieverError(
              err: Error,
              runId: string,
              parentRunId?: string,
              _tags?: string[],
            ) {
              const packet: AgentPacket = createErrorPacket(
                "handleRetrieverError",
                err,
                runId,
                parentRunId,
              );

              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
            handleAgentEnd(
              action: AgentFinish,
              runId: string,
              parentRunId?: string | undefined,
            ): void | Promise<void> {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const output =
                action.returnValues && action.returnValues["output"];

              if (output === "Agent stopped due to max iterations.") {
                // not sure why this isn't an error…
                const packet: AgentPacket = {
                  type: "handleAgentError",
                  err: "Agent stopped due to max iterations.",
                  runId,
                  parentRunId,
                };

                void handlePacket(
                  packet,
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
                  abortControllerWrapper.controller,
                  namespace!,
                  req,
                  lastToolInputs,
                );
              } else {
                const value = stringify(output);
                const packet: AgentPacket = {
                  type: "handleAgentEnd",
                  value,
                  runId,
                  parentRunId,
                };

                void handlePacket(
                  packet,
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
                  abortControllerWrapper.controller,
                  namespace!,
                  req,
                  lastToolInputs,
                );
              }
              let valuePacket: AgentPacket | undefined;
              try {
                valuePacket = parse(output as string) as AgentPacket;

                void handlePacket(
                  valuePacket,
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
                  abortControllerWrapper.controller,
                  namespace!,
                  req,
                  lastToolInputs,
                );
              } catch {}
            },
            // handleChainStart(
            //   chain,
            //   inputs,
            //   runId,
            //   parentRunId,
            //   _tags,
            //   _metadata,
            //   _runType,
            // ) {
            //   const packet: AgentPacket = {
            //     type: "handleChainStart",
            //     runId,
            //     parentRunId,
            //     chainHash: hashCode(JSON.stringify(chain)),
            //     inputsHash: hashCode(JSON.stringify(inputs)),
            //   };
            //   void handlePacket(packet, controller, encoder);
            // },
            handleChainEnd(
              outputs: ChainValues,
              runId: string,
              parentRunId?: string,
              _tags?: string[],
              _kwargs?: {
                inputs?: Record<string, unknown>;
              },
            ): Promise<void> | void {
              const packet: AgentPacket = {
                type: "handleChainEnd",
                outputs,
                runId,
                parentRunId,
              };
              void handlePacket(
                packet,
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
                abortControllerWrapper.controller,
                namespace!,
                req,
              );
            },
          }),
        ];
        const contentType = "application/yaml"; // FIXME: this should be configurable

        await startExecution(
          controller,
          creationProps,
          goalPrompt,
          parsedGoalId,
          agentPromptingMethod,
          task,
          dag,
          revieweeTaskResults,
          contentType,
          namespace!,
          req,
          encoder,
          resolveStreamEnded,
        );

        function createErrorPacket(
          type:
            | "handleAgentError"
            | "handleChainError"
            | "handleLLMError"
            | "handleToolError"
            | "handleRetrieverError",
          error: unknown,
          runId: string,
          parentRunId?: string,
        ) {
          let err: unknown;
          if (error instanceof Error) {
            err = `${error.name}: ${error.message}\n${error.stack}`;
          } else if (typeof error === "string") {
            err = error;
          } else {
            err = parse(stringify(error, Object.getOwnPropertyNames(err)));
            if (!err) {
              err = stringify(error);
            }
          }
          const packet: AgentPacket = {
            type,
            err,
            runId,
            parentRunId,
          };
          return packet;
        }
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
    console.error("execute error", e);

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
      let response:
        | Response
        | { ok: boolean; status: number; statusText: string };
      if (goalId && executionId && state && node) {
        const createResultParams: CreateResultParams = {
          goalId,
          node,
          executionId,
          packet,
          packets: historicalPackets,
          state,
        };

        const isCriticism = isTaskCriticism(node.id);

        // make sure that we are at least saving the task result so that other notes can refer back.
        const shouldSave = !isCriticism && packet.type !== "error";
        const save = shouldSave
          ? saveMemoriesSkill.skill.func({
              memories: [JSON.stringify(packet)],
              namespace: namespace!,
            })
          : Promise.resolve(
              "skipping save memory due to error or this being a criticism task",
            );

        const createResultPromise = fetch(`${req.nextUrl.origin}/api/result`, {
          method: "POST",
          headers: {
            Cookie: req.headers.get("cookie") || "", // pass cookie so session logic still works
            "Content-Type": "application/json",
          },
          body: JSON.stringify(createResultParams),
        });
        const [createResultResponse, saveResponse] = await Promise.all([
          createResultPromise,
          save,
        ]);
        console.debug("saved memory", saveResponse);
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
