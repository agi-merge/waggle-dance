import { useMemo } from "react";
import type { AlertPropsColorOverrides, ColorPaletteProp } from "@mui/joy";
import type { OverridableStringUnion } from "@mui/types";

import type { AgentSettingsMap } from "@acme/agent";

export function getIQLevel(iq: number) {
  const n =
    iqScale.find((scale) => iq <= scale.limit)! || iqScale[iqScale.length - 1];

  return n;
}

const iqScale: {
  limit: number;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  label: string;
  description: string;
}[] = [
  {
    limit: 0.56,
    color: "danger",
    label: "⚠ Lowest",
    description: `Your "IQ" score is the lowest possible, which reduces accuracy, possibly at the expense of costs and time to achieve goals`,
  },
  {
    limit: 0.62,
    color: "warning",
    label: "⚠️ Low",
    description: `Your "IQ" score is on the low end, which reduces accuracy, possibly at the expense of some costs and time to achieve goals`,
  },
  {
    limit: 0.75,
    color: "neutral",
    label: "Medium",
    description: `Your "IQ" score is near the middle range, which balances accuracy with costs and time to achieve goals`,
  },
  {
    limit: 0.86,
    color: "success",
    label: "High",
    description: `Your "IQ" score is the second highest possible, which increases accuracy, but increases costs and time to achieve goals`,
  },
  {
    limit: 1,
    color: "success",
    label: "Highest",
    description: `Your "IQ" score is the highest possible, which increases accuracy, but increases costs and time to achieve goals`,
  },
];

// the minimum IQ is 4.5, the maximum IQ is (2 * 2.7) + (1 * 2.7) + (1.5 * 2.7) = 12.15
export function iqEstimate(agentSettingsMap: AgentSettingsMap): number {
  const iqMultiplePairs = Object.entries(agentSettingsMap).map((entry) => {
    const [type, agentSettings] = entry;

    if (type !== "plan" && type !== "review" && type !== "execute") {
      throw new Error(`Invalid agent type: ${type}`);
    }
    let typeMultiplier: number;
    switch (type) {
      case "execute":
        typeMultiplier = 2;
        break;
      case "review":
        typeMultiplier = 1;
        break;
      case "plan":
        typeMultiplier = 1.5;
        break;
    }
    const base = 1;
    let multiplier = 1; // gpt-3.5
    // could be an enum mapping instead of ifs
    if (agentSettings.modelName.startsWith("gpt-4")) {
      multiplier = 2.7; // source: https://www.taivo.ai/__gpt-3-5-and-gpt-4-response-times/
    }
    return { base, multiplier, typeMultiplier };
  });

  const minMax = (n: number, lb = 0, ub = 1) => Math.min(ub, Math.max(lb, n));

  const totalIQForAgentSettings = iqMultiplePairs.reduce((acc, curr, _i) => {
    return acc + curr.base * curr.multiplier * curr.typeMultiplier;
  }, 0);

  // normalize somewhat
  const highIQ = 12.15;
  const iqNormal = minMax(totalIQForAgentSettings, 0, highIQ);
  const ratio = iqNormal / highIQ;
  const guh = Math.log(1.379 + ratio);
  return minMax(guh);
}

function useIQEstimate(agentSettings: AgentSettingsMap) {
  const iq = useMemo(() => {
    return iqEstimate(agentSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentSettings.execute.modelName,
    agentSettings.plan.modelName,
    agentSettings.review.modelName,
  ]);
  const iqLevel = useMemo(() => getIQLevel(iq), [iq]);

  return { iq, iqLevel };
}

export default useIQEstimate;
