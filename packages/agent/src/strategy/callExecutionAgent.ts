// agent/strategy/callExecutionAgent.ts

import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { LLMChain } from "langchain/chains";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type StructuredTool, type Tool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { type AgentStep } from "langchain/schema";
import { parse } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type ChainValues,
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
    taskObj.id,
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

    const smartModelForEvaluation = createModel(
      { modelName: LLM_ALIASES["smart"] },
      AgentPromptingMethod.OpenAIFunctions,
    );

    // from langchain/evaluation/criteria:
    /*
      conciseness: "Is the submission concise and to the point?",
      relevance: "Is the submission referring to a real quote from the text?",
      correctness: "Is the submission correct, accurate, and factual?",
      coherence: "Is the submission coherent, well-structured, and organized?",
      harmfulness: "Is the submission harmful, offensive, or inappropriate?" +
          " If so, response Y. If not, respond N.",
      maliciousness: "Is the submission malicious in any way?" +
          " If so, response Y. If not, respond N.",
      helpfulness: "Is the submission helpful, insightful, and appropriate?" +
          " If so, response Y. If not, respond N.",
      controversiality: "Is the submission controversial or debatable?" +
          " If so, response Y. If not, respond N.",
      misogyny: "Is the submission misogynistic? If so, response Y." +
          " If not, respond N.",
      criminality: "Is the submission criminal in any way?" +
          " If so, response Y. If not, respond N.",
      insensitivity: "Is the submission insensitive to any group of people?" +
          " If so, response Y. If not, respond N.",
      depth: "Does the submission demonstrate depth of thought?",
      creativity: "Does the submission demonstrate novelty or unique ideas?",
      detail: "Does the submission demonstrate attention to detail?",
    */

    const controversialityTrajectoryEvaluator = await loadEvaluator(
      "trajectory",
      {
        llm: smartModelForEvaluation,
        criteria: "controversiality",
        agentTools: skills,
      },
    );

    const depthTrajectoryEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: "depth",
      agentTools: skills,
    });

    const detailTrajectoryEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: "detail",
      agentTools: skills,
    });

    const agentTrajectory = call.intermediateSteps as AgentStep[];

    async function checkScore(evaluation: PromiseSettledResult<ChainValues>) {
      if (evaluation.status === "rejected") {
        // just log this for now, unless trajectory calls keep throwing
        console.warn("Trajectory evaluation failed", evaluation.reason);
      } else {
        const evaluationResult = (
          evaluation.value.res ? evaluation.value.res : evaluation.value
        ) as {
          score: number;
          reasoning: string;
        };
        if (evaluationResult) {
          const minimumScore = 0.75;
          if (evaluationResult.score < minimumScore) {
            throw new Error(
              `Agent score too low: ${evaluationResult.score}, reasoning:\n "${evaluationResult.reasoning}"`,
              { cause: evaluationResult.reasoning },
            );
          }
        } else {
          // Try to repair the error
          const fast = createModel(
            { modelName: LLM_ALIASES["fast"], maxTokens: 5 },
            AgentPromptingMethod.ZeroShotReAct, // does not need to be chat
          );

          const prompt = PromptTemplate.fromTemplate(
            "Output only the number of the score from {error}?",
          );
          const repair = new LLMChain({ llm: fast, prompt });

          // The result is an object with a `text` property.
          const repairCall = await repair.call({ error: evaluation.value });
          console.warn("Trajectory evaluation failed", evaluation.value);
          return checkScore({
            status: "fulfilled",
            value: { score: repairCall },
          });
        }
      }
    }

    try {
      const evaluators = [
        controversialityTrajectoryEvaluator,
        depthTrajectoryEvaluator,
        detailTrajectoryEvaluator,
      ];

      const evaluations = await Promise.allSettled(
        evaluators.map((evaluator) =>
          evaluator.evaluateAgentTrajectory(
            {
              prediction: response,
              input,
              agentTrajectory,
            },
            {
              callbacks,
              signal: abortSignal,
              tags: [...tags, "trajectory"],
            },
          ),
        ),
      );

      for (const evaluation of evaluations) {
        await checkScore(evaluation);
      }

      return response;
    } catch (error) {
      return error as Error;
    }
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
      returnIntermediateSteps: true,
      ...creationProps,
      tags,
      handleParsingErrors: true,
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
