import { useMemo } from "react";
import type {AlertPropsColorOverrides, ColorPaletteProp} from "@mui/joy";
import type {OverridableStringUnion} from "@mui/types";

const rigorScale: {
  limit: number;
  color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
  label: string;
  description: string;
}[] = [
  {
    limit: 0.35,
    color: "danger",
    label: "⚠ Lowest",
    description: `Your rigor score is the lowest possible, which reduces rigor, possibly at the expense of costs and time to achieve goals`,
  },
  {
    limit: 0.45,
    color: "warning",
    label: "Low",
    description: `Your rigor score is on the low end, which reduces rigor, possibly at the expense of some costs and time to achieve goals`,
  },
  {
    limit: 0.8,
    color: "neutral",
    label: "Medium",
    description: `Your rigor score is near the middle range, which balances rigor with costs and time to achieve goals`,
  },
  {
    limit: 0.85,
    color: "success",
    label: "High",
    description: `Your rigor score is the second highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
  {
    limit: 1,
    color: "success",
    label: "Highest",
    description: `Your rigor score is the highest possible, which increases rigor, but increases costs and time to achieve goals`,
  },
];

function getRigorLevel(rigor: number) {
  const rl =
    rigorScale.find((scale) => rigor <= scale.limit)! ||
    rigorScale[rigorScale.length - 1];

  return rl;
}

export const useRigorEstimate = (latency: number) => {
  const rigor = useMemo(() => {
    return 1 + Math.log(latency);
  }, [latency]);
  const rigorLevel = useMemo(() => getRigorLevel(rigor), [rigor]);

  return { rigorLevel };
};
