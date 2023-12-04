import type { AgentPromptingMethod, LLM, Temperature } from "./llms";

export interface AgentSettings {
  modelName: LLM;
  temperature: Temperature;
  agentPromptingMethod: AgentPromptingMethod | null;
  maxTokens?: number | undefined;
  // see: https://platform.openai.com/docs/api-reference/chat/create
  topP?: number | undefined;
  maxConcurrency: number;
  frequencyPenalty?: number | undefined;
  presencePenalty?: number | undefined;
  logitBias?: Record<string, number> | undefined;
}

export type AgentSettingsMap = Record<
  "plan" | "review" | "execute",
  AgentSettings
>;

export default AgentSettings;
