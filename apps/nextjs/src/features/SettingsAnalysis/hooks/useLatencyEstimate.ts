import { useMemo } from "react";
import { type AlertPropsColorOverrides, type ColorPaletteProp } from "@mui/joy";
import { type OverridableStringUnion } from "@mui/types";

import {
  defaultAgentSettings,
  type AgentSettings,
  type AgentSettingsMap,
} from "@acme/agent";
import { AgentPromptingMethod } from "@acme/agent/src/utils/llms";
import { type NullableSkillset } from "@acme/db/skills";

export type LatencyScaleItem = {
  limit: number;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  label: string;
  description: string;
};

// Define the latency scale and corresponding colors
const latencyScale: LatencyScaleItem[] = [
  {
    limit: 0,
    color: "success",
    label: "Highest",
    description: `Your speed score is the highest possible, which reduces costs and time to achieve goals, possibly at the expense of rigor and IQ`,
  },
  {
    limit: 0.5,
    color: "success",
    label: "High",
    description: `Your speed score is on the high end, which reduces costs and time to achieve goals, possibly at the expense of rigor and IQ`,
  },
  {
    limit: 0.78,
    color: "neutral",
    label: "Medium",
    description: `Your speed score is near the middle range, which balances costs and time to achieve goals with rigor`,
  },
  {
    limit: 0.86,
    color: "warning",
    label: "⚠ Low",
    description: `Your speed score is the second lowest possible, which increases costs and time to achieve goals, but increases rigor`,
  },
  {
    limit: 1,
    color: "danger",
    label: "⚠ Lowest",
    description: `Your speed score is the lowest possible, which increases costs and time to achieve goals, but increases rigor`,
  },
];

// Get latency level based on the latency value
export function getLatencyLevel(latency: number) {
  return (latencyScale.find((scale) => latency <= scale.limit) ||
    latencyScale[latencyScale.length - 1])!; // idk tsc was complaining without the bang
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

  // normalize somewhat
  const latencyRaw = totalLatencyForAgentSettings + skillsFactor;
  const highLatency = 22;
  const latencyNormal = minMax(latencyRaw, 0, highLatency);
  const ratio = latencyNormal / highLatency;
  const guh = Math.log(1.379 + ratio) / 1;
  return minMax(guh);
}

function useLatencyEstimate(
  agentSettings: Record<"plan" | "review" | "execute", AgentSettings>,
  selectedSkills: NullableSkillset[],
) {
  const latency = useMemo(() => {
    return latencyEstimate(
      agentSettings,
      selectedSkills.length,
      defaultAgentSettings,
    );
  }, [agentSettings, selectedSkills]);
  const latencyLevel = useMemo(() => getLatencyLevel(latency), [latency]);
  return { latency, latencyLevel };
}

export default useLatencyEstimate;
