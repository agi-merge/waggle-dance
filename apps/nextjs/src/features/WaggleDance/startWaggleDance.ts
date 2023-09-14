// features/WaggleDance/startWaggleDance.ts

import { type WaggleDanceResult } from "./types/types";
import TaskExecutor, { type RunParams } from "./types/WaggleDanceAgentExecutor";

export const startWaggleDance = async (
  params: RunParams,
): Promise<WaggleDanceResult> => {
  const {
    agentSettings,
    goal,
    goalId,
    executionId,
    abortController,
    graphDataState,
    injectAgentPacket,
    log,
  } = params;
  const taskExecutor = new TaskExecutor(
    agentSettings,
    goal,
    goalId,
    executionId,
    new Set(),
    abortController,
    graphDataState,
    injectAgentPacket,
    log,
  );

  return await taskExecutor.run();
};
