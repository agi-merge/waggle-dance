import { type Callbacks } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { type AgentTrajectoryEvaluator } from "langchain/dist/evaluation/base";
import { PromptTemplate } from "langchain/prompts";
import { type AgentStep } from "langchain/schema";

import { type ChainValues } from "../strategy/AgentPacket";
import { AgentPromptingMethod, LLM_ALIASES } from "../utils/llms";
import { createModel } from "../utils/model";

async function checkTrajectory(
  response: string,
  input: string,
  agentTrajectory: AgentStep[],
  abortSignal: AbortSignal,
  tags: string[],
  callbacks: Callbacks | undefined,
  evaluators: AgentTrajectoryEvaluator[],
) {
  if (process.env.EXE_TRAJECTORY_EVALUATION !== "true") {
    return;
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

  await Promise.all(evaluations.map(checkScore));
}

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
      const minimumScore = 0.5;
      if (evaluationResult.score < minimumScore) {
        throw new Error(
          `Low review score: ${evaluationResult.score}. Reasoning: ${evaluationResult.reasoning}"`,
          { cause: evaluationResult.reasoning },
        );
      } else {
        console.debug("Trajectory evaluation passed", evaluationResult);
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

export default checkTrajectory;
