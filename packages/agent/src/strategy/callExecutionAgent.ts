// agent/strategy/callExecutionAgent.ts

import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type OpenAI } from "langchain/dist";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type Tool } from "langchain/dist/tools/base";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { parse } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import { createCriticizePrompt, createExecutePrompt, TaskState } from "../..";
import { isTaskCriticism } from "../prompts/types";
import {
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  LLM_ALIASES,
  type AgentPromptingMethod,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";
import type Geo from "./Geo";

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goal: string;
  goalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  namespace?: string;
  geo?: Geo;
}): Promise<string | Error> {
  const {
    creationProps,
    goal,
    agentPromptingMethod,
    task,
    dag,
    revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
    abortSignal,
    namespace,
    contentType,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps, agentPromptingMethod);
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = parse(task) as { id: string };
  const isReview = isTaskCriticism(taskObj.id);
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  // methods need to be reattached
  const revieweeTaskResults = revieweeTaskResultsNeedDeserialization.map(
    (t) => new TaskState({ ...t }),
  );

  if (isReview && !revieweeTaskResults) {
    throw new Error("No result found to provide to review task");
  }

  const nodes = (parse(dag) as DraftExecutionGraph).nodes;
  const prompt = isReview
    ? createCriticizePrompt({
        revieweeTaskResults,
        nodes,
        returnType,
      })
    : createExecutePrompt({
        task,
        goal,
        returnType,
        modelName: creationProps.modelName || LLM_ALIASES["fast"],
      });
  const formattedMessages = await prompt.formatMessages({});

  const input: string = formattedMessages
    .map((m) => `${m._getType()}: ${m.content}`)
    .join("\n");

  // optional tools
  const tags = [
    isReview ? "criticize" : "execute",
    agentPromptingMethod,
    taskObj.id,
  ];
  creationProps.modelName && tags.push(creationProps.modelName);

  const skills = await createSkills(
    namespace,
    llm,
    embeddings,
    tags,
    callbacks,
  );

  const executor = await initializeExecutor(
    goal,
    agentPromptingMethod,
    taskObj,
    creationProps,
    skills,
    llm,
    tags,
  );

  // prompt.pipe(executor).invoke({});
  try {
    const call = await executor.call(
      {
        input,
        signal: abortSignal,
        tags,
      },
      callbacks,
    );

    const response = call?.output ? (call.output as string) : "";
    if (response === "Agent stopped due to max iterations.") {
      // brittle; this should really be an error in langchain
      throw new Error(response);
    }
    return response;
  } catch (error) {
    return error as Error;
  }
}
async function initializeExecutor(
  goal: string,
  agentPromptingMethod: AgentPromptingMethod,
  taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: Tool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
) {
  let executor;
  const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
  let options:
    | InitializeAgentExecutorOptions
    | InitializeAgentExecutorOptionsStructured;
  if (
    InitializeAgentExecutorOptionsAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsAgentType,
    )
  ) {
    options = {
      agentType,
      returnIntermediateSteps: false,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptions;

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType,
      returnIntermediateSteps: false,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptionsStructured;
    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools,
      tags,
    });
  }
  return executor;
}
