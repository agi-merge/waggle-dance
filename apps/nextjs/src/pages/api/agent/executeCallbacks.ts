// callbackHandlers.ts
// callbacks.ts

import type { TextEncoder } from "util";
import type { NextRequest } from "next/server";
import { BaseCallbackHandler } from "langchain/callbacks";
import type { CallbackHandlerMethods } from "langchain/callbacks";
import type { Document } from "langchain/document";
import type { Serialized } from "langchain/load/serializable";
import type { LLMResult } from "langchain/schema";
import { parse, stringify } from "yaml";

// Ephemeral, in-memory vector store for demo purposes

import type { AgentPromptingMethod } from "@acme/agent/src/utils/llms";
import type { DraftExecutionGraph, DraftExecutionNode } from "@acme/db";

import type {
  AgentPacket,
  ModelCreationProps,
  TaskState,
} from "../../../../../../packages/agent";

const maxLogSize = 4096;

export interface CreateCallbackParams {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  creationProps: ModelCreationProps;
  goalPrompt: string;
  parsedGoalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: DraftExecutionNode;
  dag: DraftExecutionGraph;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortController: AbortController;
  executionNamespace: string;
  req: NextRequest;
  lastToolInputs?: Map<string, string>;
}

export const createCallbacks = (
  handlePacket: (
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
    executionNamespace: string,
    req: NextRequest,
    lastToolInputs?: Map<string, string>,
  ) => Promise<void>,
  params: CreateCallbackParams,
): CallbackHandlerMethods[] => {
  const {
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
    executionNamespace,
    req,
    lastToolInputs,
  } = params;
  return [
    BaseCallbackHandler.fromMethods({
      handleRetrieverStart(
        retriever: Serialized,
        query: string,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        metadata?: Record<string, unknown>,
      ): void | Promise<void> {
        console.debug("handleRetrieverStart", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleRetrieverEnd(
        documents: Document[],
        runId: string,
        parentRunId?: string,
        tags?: string[],
      ): void | Promise<void> {
        console.debug("handleRetrieverEnd", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>,
        tags?: string[],
        metadata?: Record<string, unknown>,
        name?: string,
      ): Promise<void> | void {
        console.debug("handleLLMStart", runId, parentRunId);
        const packet: AgentPacket = {
          type: "handleLLMStart",
          runId,
          parentRunId,
          prompts,
          name,
          extraParams,
          tags,
          metadata,
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleLLMEnd(
        output: LLMResult,
        runId: string,
        parentRunId?: string,
      ): Promise<void> | void {
        console.debug("handleLLMEnd", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleLLMError(
        err: unknown,
        runId: string,
        parentRunId?: string | undefined,
      ): void | Promise<void> {
        console.warn("handleLLMError", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
        console.error("handleLLMError", String(err).slice(0, maxLogSize));
      },
      handleChainError(
        err: unknown,
        runId: string,
        parentRunId?: string | undefined,
      ): void | Promise<void> {
        console.debug("handleChainError", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        ); // can be 'Output parser not set'
        console.error("handleChainError", String(err).slice(0, maxLogSize));
      },
      handleToolStart(
        tool: Serialized,
        input: string,
        runId: string,
        parentRunId?: string | undefined,
      ): void | Promise<void> {
        console.debug("handleToolStart", runId, parentRunId);
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleToolEnd(
        output: string,
        runId: string,
        parentRunId?: string | undefined,
      ): void | Promise<void> {
        console.debug("handleToolEnd", runId, parentRunId);
        const packet: AgentPacket = {
          type: "handleToolEnd",
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
      },
      handleToolError(
        err: unknown,
        runId: string,
        parentRunId?: string | undefined,
      ): void | Promise<void> {
        console.debug("handleToolError", runId, parentRunId);
        const packet: AgentPacket = createErrorPacket(
          "handleToolError",
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
          abortController,
          executionNamespace,
          req,
          lastToolInputs,
        );
        console.error("handleToolError", String(err).slice(0, maxLogSize));
      },
    }),
  ];
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
