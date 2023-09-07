// utils/llms.ts

import { type AgentSettingsMap } from "../..";

// TODO: use APIs to list eligible models

export enum LLM {
  "embeddings" = "text-embedding-ada-002",
  "gpt-4" = "gpt-4",
  "gpt-4-0613" = "gpt-4-0613",
  "gpt-4-0314" = "gpt-4-0314",
  // "gpt-4-32k" = "gpt-4-32k",
  // "gpt-4-32k-0613" = "gpt-4-32k-0613",
  "gpt-3.5-turbo" = "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k" = "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0613" = "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-0301" = "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-16k-0613" = "gpt-3.5-turbo-16k-0613",
}

export const LLM_ALIASES = {
  fast: LLM["gpt-3.5-turbo"],
  "fast-large": LLM["gpt-3.5-turbo-16k"],
  smart: LLM["gpt-4-0314"],
  // "smart-large": LLM["gpt-4-32k"],
  embeddings: LLM["embeddings"],
};

export enum Temperature {
  Stable = "Stable",
  Balanced = "Balanced",
  Creative = "Creative",
}

export const TEMPERATURE_VALUES = {
  [Temperature.Stable]: 0,
  [Temperature.Balanced]: 0.4,
  [Temperature.Creative]: 0.9,
};

export enum AgentPromptingMethod {
  ZeroShotReAct = "Zero-shot ReAct",
  ChatZeroShotReAct = "Chat Zero-shot ReAct",
  ChatConversationalReAct = "Chat Conversational ReAct",
  PlanAndExecute = "Plan and Execute",
  OpenAIStructuredChat = "Structured Chat Zero Shot ReAct",
  OpenAIFunctions = "OpenAI Functions",
}

export const InitializeAgentExecutorOptionsAgentTypes = [
  "zero-shot-react-description",
  "chat-zero-shot-react-description",
  "chat-conversational-react-description",
] as const;

export const InitializeAgentExecutorOptionsStructuredAgentTypes = [
  "structured-chat-zero-shot-react-description",
  "openai-functions",
] as const;

export type InitializeAgentExecutorOptionsAgentType =
  (typeof InitializeAgentExecutorOptionsAgentTypes)[number];
export type InitializeAgentExecutorOptionsStructuredAgentType =
  (typeof InitializeAgentExecutorOptionsStructuredAgentTypes)[number];

export type AgentType =
  | InitializeAgentExecutorOptionsAgentType
  | InitializeAgentExecutorOptionsStructuredAgentType;

export function getAgentPromptingMethodValue(
  method: Exclude<AgentPromptingMethod, "PlanAndExecute">, // different AgentExecutor, see callExecutionAgent.ts
): AgentType | null {
  switch (method) {
    case AgentPromptingMethod.ZeroShotReAct:
      return "zero-shot-react-description";
    case AgentPromptingMethod.ChatZeroShotReAct:
      return "chat-zero-shot-react-description";
    case AgentPromptingMethod.ChatConversationalReAct:
      return "chat-conversational-react-description";
    case AgentPromptingMethod.OpenAIStructuredChat:
      return "structured-chat-zero-shot-react-description";
    case AgentPromptingMethod.OpenAIFunctions:
      return "openai-functions";
    case AgentPromptingMethod.PlanAndExecute:
      return null; //throw new Error("PlanAndExecute is not a valid prompting method");
  }
}

export function latencyEstimate(
  agentSettingsMap: AgentSettingsMap,
  skillsCount: number,
  defaultAgentSettings: AgentSettingsMap,
): number {
  const latencyMultiplierPairs = Object.entries(agentSettingsMap).map(
    (entry) => {
      const [type, agentSettings] = entry;

      if (type !== "plan" && type !== "review" && type !== "execute") {
        throw new Error(`Invalid agent type: ${type}`);
      }
      let promptingMethod =
        agentSettings.agentPromptingMethod ||
        defaultAgentSettings[type].agentPromptingMethod;
      if (promptingMethod === null) {
        switch (type) {
          case "execute":
            promptingMethod = AgentPromptingMethod.ChatConversationalReAct;
          case "plan":
            promptingMethod = AgentPromptingMethod.ZeroShotReAct;
          case "review":
            promptingMethod = AgentPromptingMethod.ZeroShotReAct;
        }
        // throw new Error("Agent prompting method is null");
      }
      let typeMultiplier: number;
      switch (type) {
        case "execute":
          typeMultiplier = 2;
        case "review":
          typeMultiplier = 1.25;
        case "plan":
          typeMultiplier = 1;
      }
      let latency = 0;
      let multiplier = 1; // gpt-3.5
      // could be an enum mapping instead of ifs
      if (agentSettings.modelName.startsWith("gpt-4")) {
        multiplier = 2.7; // source: https://www.taivo.ai/__gpt-3-5-and-gpt-4-response-times/
      }
      switch (promptingMethod) {
        case AgentPromptingMethod.ZeroShotReAct:
          latency += 1;
        case AgentPromptingMethod.OpenAIFunctions:
          latency += 1.1;
          break;
        case AgentPromptingMethod.ChatZeroShotReAct:
          latency += 1.1;
          break;
        case AgentPromptingMethod.ChatConversationalReAct:
          latency += 2;
          break;
        case AgentPromptingMethod.OpenAIStructuredChat:
          latency += 1.15;
          break;
        case AgentPromptingMethod.PlanAndExecute:
          latency += 3;
          break;
      }
      return { latency, multiplier, typeMultiplier };
    },
  );

  const minMax = (n: number, lb: number = 0, ub: number = 1) =>
    Math.min(ub, Math.max(lb, n));

  const totalLatencyForAgentSettings = latencyMultiplierPairs.reduce(
    (acc, curr, _i) => {
      return acc + curr.latency * curr.multiplier * curr.typeMultiplier;
    },
    0,
  );

  const skillsFactor = skillsCount * 0.1;

  // TODO: normalize ln

  // const totalMultiplier = latencyMultiplierPairs.reduce(

  // const totalMultipler = latencyMultiplierPairs.reduce()
  // return totalLatencyForAgentSettings + skillsCount * 0.1;
  const latencyRaw = totalLatencyForAgentSettings + skillsFactor;
  const highLatency = 22;
  const latencyNormal = minMax(latencyRaw, 0, highLatency);
  const ratio = latencyNormal / highLatency;
  const guh = Math.log(1.379 + ratio) / 1;
  return minMax(guh);
}

export function rigorEstimate(
  agentSettingsMap: AgentSettingsMap,
  skillsCount: number,
  defaultAgentSettings: AgentSettingsMap,
): number {
  const latencyMultiplierPairs = Object.entries(agentSettingsMap).map(
    (entry) => {
      const [type, agentSettings] = entry;

      if (type !== "plan" && type !== "review" && type !== "execute") {
        throw new Error(`Invalid agent type: ${type}`);
      }
      let promptingMethod =
        agentSettings.agentPromptingMethod ||
        defaultAgentSettings[type].agentPromptingMethod;
      if (promptingMethod === null) {
        switch (type) {
          case "execute":
            promptingMethod = AgentPromptingMethod.ChatConversationalReAct;
          case "plan":
            promptingMethod = AgentPromptingMethod.ZeroShotReAct;
          case "review":
            promptingMethod = AgentPromptingMethod.ZeroShotReAct;
        }
        // throw new Error("Agent prompting method is null");
      }
      let typeMultiplier: number;
      switch (type) {
        case "execute":
          typeMultiplier = 1.5;
        case "review":
          typeMultiplier = 1.25;
        case "plan":
          typeMultiplier = 1;
      }
      let latency = 0;
      let multiplier = 1; // gpt-3.5
      // could be an enum mapping instead of ifs
      if (agentSettings.modelName.startsWith("gpt-4")) {
        multiplier = 2.7; // source: https://www.taivo.ai/__gpt-3-5-and-gpt-4-response-times/
      }
      switch (promptingMethod) {
        case AgentPromptingMethod.ZeroShotReAct:
          latency += 1;
        case AgentPromptingMethod.OpenAIFunctions:
          latency += 1.1;
          break;
        case AgentPromptingMethod.ChatZeroShotReAct:
          latency += 1.5;
          break;
        case AgentPromptingMethod.ChatConversationalReAct:
          latency += 2.25;
          break;
        case AgentPromptingMethod.OpenAIStructuredChat:
          latency += 1.5;
          break;
        case AgentPromptingMethod.PlanAndExecute:
          latency += 3;
          break;
      }
      return { latency, multiplier, typeMultiplier };
    },
  );

  const totalLatencyForAgentSettings = latencyMultiplierPairs.reduce(
    (acc, curr, _i) => {
      return acc + curr.latency * curr.multiplier * curr.typeMultiplier;
    },
    0,
  );

  const skillsFactor = skillsCount * 0.1;

  // TODO: normalize ln

  // const totalMultiplier = latencyMultiplierPairs.reduce(

  // const totalMultipler = latencyMultiplierPairs.reduce()
  // return totalLatencyForAgentSettings + skillsCount * 0.1;
  return totalLatencyForAgentSettings + skillsFactor;
}

export interface Model {
  name: LLM;
  description: string;
  maxTokens: number;
  trainingData: string;
}

export interface Setting {
  name: string;
  value: string | LLM | Temperature;
  requiresAuth: boolean;
  setValue: (value: string | LLM | Temperature) => void;
}

export const llmResponseTokenLimit = (llm: string) => {
  switch (llm) {
    case LLM.embeddings:
      return 256;
    default:
      return -1;
  }
};

export const models: Model[] = [
  {
    name: LLM["gpt-4"],
    description:
      "More capable than any GPT-3.5 model, able to do more complex tasks, and optimized for chat. Will be updated with our latest model iteration 2 weeks after it is released.",
    maxTokens: 8192,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-4-0613"],
    description:
      "Snapshot of gpt-4 from June 13th 2023 with function calling data. Unlike gpt-4, this model will not receive updates, and will be deprecated 3 months after a new version is released.",
    maxTokens: 8192,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-4-0314"],
    description:
      "Snapshot of gpt-4 from March 14th 2023. Discontinues at earliest 06/13/2024.",
    maxTokens: 8192,
    trainingData: "Up to Sep 2021",
  },
  // {
  //   name: LLM["gpt-4-32k"],
  //   description:
  //     "Same capabilities as the base gpt-4 mode but with 4x the context length. Will be updated with our latest model iteration.",
  //   maxTokens: 32768,
  //   trainingData: "Up to Sep 2021",
  // },
  // {
  //   name: LLM["gpt-4-32k-0613"],
  //   description:
  //     "Snapshot of gpt-4-32 from June 13th 2023. Unlike gpt-4-32k, this model will not receive updates, and will be deprecated 3 months after a new version is released.",
  //   maxTokens: 32768,
  //   trainingData: "Up to Sep 2021",
  // },
  {
    name: LLM["gpt-3.5-turbo"],
    description:
      "Most capable GPT-3.5 model and optimized for chat at 1/10th the cost of text-davinci-003. Will be updated with our latest model iteration 2 weeks after it is released.",
    maxTokens: 4096,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-3.5-turbo-16k"],
    description:
      "Same capabilities as the standard gpt-3.5-turbo model but with 4 times the context.",
    maxTokens: 16384,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-3.5-turbo-0613"],
    description:
      "Snapshot of gpt-3.5-turbo from June 13th 2023 with function calling data. Unlike gpt-3.5-turbo, this model will not receive updates, and will be deprecated 3 months after a new version is released.",
    maxTokens: 4096,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-3.5-turbo-0301"],
    description:
      "Snapshot of gpt-3.5-turbo from March 1st 2023. Discontinues at earliest 06/13/2024.",
    maxTokens: 4096,
    trainingData: "Up to Sep 2021",
  },
  {
    name: LLM["gpt-3.5-turbo-16k-0613"],
    description:
      "Snapshot of gpt-3.5-turbo-16k from June 13th 2023. Unlike gpt-3.5-turbo-16k, this model will not receive updates, and will be deprecated 3 months after a new version is released.",
    maxTokens: 16384,
    trainingData: "Up to Sep 2021",
  },
];
