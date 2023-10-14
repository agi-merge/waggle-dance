// agent/strategy/callExecutionAgent.ts

import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type StructuredTool, type Tool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import { type AgentStep } from "langchain/schema";
import { parse } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type MemoryType,
} from "../..";
import { isTaskCriticism } from "../prompts/types";
import {
  AgentPromptingMethod,
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  LLM_ALIASES,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";
import type Geo from "./Geo";

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  goalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  namespace: string;
  geo?: Geo;
}): Promise<string | Error> {
  const {
    goalId: _goalId,
    creationProps,
    goalPrompt,
    agentPromptingMethod,
    task,
    dag,
    revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
    abortSignal,
    namespace,
    contentType,
    geo,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps, agentPromptingMethod);
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = parse(task) as { id: string };
  const isCriticism = isTaskCriticism(taskObj.id);
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const memory = await createMemory({
    namespace, // temporary?
    taskId: taskObj.id,
  });
  // methods need to be reattached
  const revieweeTaskResults = revieweeTaskResultsNeedDeserialization.map(
    (t) => new TaskState({ ...t }),
  );

  if (isCriticism && !revieweeTaskResults) {
    throw new Error("No result found to provide to review task");
  }

  const nodes = (parse(dag) as DraftExecutionGraph).nodes;
  const prompt = isCriticism
    ? createCriticizePrompt({
        revieweeTaskResults,
        nodes,
        namespace,
        returnType,
      })
    : createExecutePrompt({
        task,
        goalPrompt,
        namespace,
        returnType,
        modelName: creationProps.modelName || LLM_ALIASES["fast"],
      });
  const formattedMessages = await prompt.formatMessages({});

  const input: string = formattedMessages
    .map((m) => `${m._getType()}: ${m.content}`)
    .join("\n");

  const tags = [
    isCriticism ? "criticize" : "execute",
    agentPromptingMethod,
    taskObj.id,
  ];
  namespace && tags.push(namespace);
  creationProps.modelName && tags.push(creationProps.modelName);

  const skills = createSkills(
    llm,
    embeddings,
    agentPromptingMethod,
    isCriticism,
    returnType,
    geo,
  );

  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    skills,
    llm,
    tags,
    memory,
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

    const chainWithTools = await loadEvaluator("trajectory", {
      llm: createModel(
        { modelName: LLM_ALIASES["fast"] },
        AgentPromptingMethod.OpenAIStructuredChat,
      ),
      agentTools: skills,
    });

    const agentTrajectory = call.intermediateSteps as AgentStep[];
    const trajectoryEvaluation = (await chainWithTools.evaluateAgentTrajectory({
      prediction: response,
      input,
      agentTrajectory,
    })) as { res?: { reasoning: string; score: number } };

    console.log(trajectoryEvaluation);

    if (trajectoryEvaluation.res && trajectoryEvaluation.res?.score < 0.75) {
      throw new Error(
        `Agent score too low: ${trajectoryEvaluation.res.score}, reasoning:\n "${trajectoryEvaluation.res.reasoning}}"`,
        { cause: trajectoryEvaluation.res.reasoning },
      );
    }
    return response;
  } catch (error) {
    return error as Error;
  }
}
async function initializeExecutor(
  _goalPrompt: string,
  agentPromptingMethod: AgentPromptingMethod,
  _taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: StructuredTool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
  memory: MemoryType,
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
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: false,
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptions;

    if (
      agentType !== "zero-shot-react-description" &&
      agentType !== "chat-zero-shot-react-description"
    ) {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      tools as Tool[],
      llm,
      options,
    );
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType,
      returnIntermediateSteps: true,
      earlyStoppingMethod: "generate",
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptionsStructured;

    if (agentType !== "structured-chat-zero-shot-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: tools as Tool[],
      tags,
    });
  }
  return executor;
}
