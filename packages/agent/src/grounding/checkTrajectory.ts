import { type Callbacks } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { type AgentTrajectoryEvaluator } from "langchain/dist/evaluation/base";
import { PromptTemplate } from "langchain/prompts";
import { type AgentStep } from "langchain/schema";

import { type ChainValues } from "../strategy/AgentPacket";
import { LLM_ALIASES, ModelStyle } from "../utils/llms";
import { createModel } from "../utils/model";

async function checkTrajectory(
  response: string,
  originalResponse: string,
  input: string,
  agentTrajectory: AgentStep[],
  abortSignal: AbortSignal,
  tags: string[],
  callbacks: Callbacks | undefined,
  evaluators: AgentTrajectoryEvaluator[],
): Promise<string | null> {
  // FIXME: move env.mjs out of the nextjs app and into a package to use it instead
  let minimumScore: number | null;
  if (process.env.EXE_TRAJECTORY_EVALUATION === "true") {
    minimumScore = 0.5;
  } else if (process.env.EXE_TRAJECTORY_EVALUATION === "false") {
    minimumScore = null;
  } else if (process.env.EXE_TRAJECTORY_EVALUATION) {
    minimumScore = parseFloat(process.env.EXE_TRAJECTORY_EVALUATION);
  } else {
    minimumScore = null;
  }

  if (minimumScore === null || Number.isNaN(minimumScore)) {
    console.debug(`Skipping trajectory evaluation`);
    return null;
  }

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

  return (
    (
      await Promise.all(
        evaluations.map((e) =>
          checkScore(e, response, originalResponse, minimumScore),
        ),
      )
    ).find((v) => v?.length ?? false) || null
  );
}

async function checkScore(
  evaluation: PromiseSettledResult<ChainValues>,
  response: string,
  originalResponse: string,
  minimumScore: number,
): Promise<string | null> {
  if (evaluation.status === "rejected") {
    // just log this for now, unless trajectory calls keep throwing
    console.warn("Trajectory evaluation failed", evaluation.reason);
    return null;
  } else {
    const evaluationResult = (
      evaluation.value.res ? evaluation.value.res : evaluation.value
    ) as {
      score: number;
      reasoning: string;
    };
    if (evaluationResult) {
      if (evaluationResult.score < minimumScore) {
        throw new Error(
          `**This task failed review:**: ${
            evaluationResult.score * 100
          }/100. \n\n# Task Result:\n\n${response}${
            originalResponse !== response
              ? `\n\n### Original Result: \n\n${originalResponse}`
              : ""
          }\n## Failure Reasoning:\n\n${evaluationResult.reasoning}"\n\n`,
          { cause: evaluationResult.reasoning },
        );
      } else {
        console.debug("Trajectory evaluation passed", evaluationResult);
      }
      return evaluationResult.reasoning;
    } else {
      // Try to repair the error
      const fast = createModel(
        { modelName: LLM_ALIASES["fast"], maxTokens: 3 },
        ModelStyle.Instruct, // does not need to be chat
      );

      const prompt = PromptTemplate.fromTemplate(
        "In one character only, extract and output only the number of the score that is mentioned in:\n{error}.",
      );
      const repair = new LLMChain({ llm: fast, prompt });

      // The result is an object with a `text` property.
      const repairCall = (await repair.call({ error: evaluation.value })) as {
        text: string;
      };
      const score: number | undefined = !!repairCall.text
        ? Number.parseFloat(repairCall.text) / 5
        : undefined;
      console.warn("Trajectory evaluation parsing failed", evaluation.value);

      return checkScore(
        {
          status: "fulfilled",
          value: { score },
        },
        response,
        originalResponse,
        minimumScore,
      );
    }
  }
}

export default checkTrajectory;
