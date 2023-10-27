import { AgentPromptingMethod, LLM_ALIASES, Temperature } from "./llms";

export const defaultAgentSettings = {
  plan: {
    modelName: LLM_ALIASES["fast"],
    temperature: Temperature.Stable,
    maxTokens: 2000,
    agentPromptingMethod: null,
    maxConcurrency: 4,
  },
  review: {
    modelName: LLM_ALIASES["fast"],
    temperature: Temperature.Stable,
    maxTokens: 400,
    agentPromptingMethod: AgentPromptingMethod.OpenAIStructuredChat,
    maxConcurrency: 4,
  },
  execute: {
    modelName: LLM_ALIASES["fast-large"],
    temperature: Temperature.Stable,
    maxTokens: 1000,
    agentPromptingMethod: AgentPromptingMethod.OpenAIStructuredChat,
    maxConcurrency: 6,
  },
};

export default defaultAgentSettings;
