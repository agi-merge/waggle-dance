// TokenChip.tsx
import { useMemo } from "react";
import { Chip, Stack, Tooltip, Typography, type ChipProps } from "@mui/joy";
import { encodingForModel, type Tiktoken } from "js-tiktoken";
import { useDebounce } from "use-debounce";

import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

const defaultMaxTokens = 200;

const calculateRemainingTokens = (
  text: string,
  encoder: Tiktoken,
  maxTokens: number,
) => {
  const tokenCount = encoder.encode(text).length;
  return maxTokens - tokenCount;
};

type TokenChipProps = {
  prompt: string;
  maxTokens?: number;
} & ChipProps;

export const TokenChip = ({ prompt, maxTokens, ...props }: TokenChipProps) => {
  const { agentSettings } = useWaggleDanceMachineStore();

  const encoder = useMemo(
    () => encodingForModel(agentSettings.plan.modelName),
    [agentSettings.plan.modelName],
  );

  const maxTokensOrDefault = useMemo(
    () => maxTokens ?? defaultMaxTokens,
    [maxTokens],
  );

  const [debouncedPrompt, _state] = useDebounce(prompt, 50);

  const remainingTokens = useMemo(
    () =>
      calculateRemainingTokens(debouncedPrompt, encoder, maxTokensOrDefault),

    [debouncedPrompt, encoder, maxTokensOrDefault],
  );

  const color = useMemo(() => {
    const ratioRed = 0.91;
    const ratioYellow = 0.85;
    const ratioGreen = 0.75;
    if (remainingTokens < 0) {
      return "danger";
    }
    if (remainingTokens > maxTokensOrDefault * ratioRed) {
      return "danger";
    } else if (remainingTokens > maxTokensOrDefault * ratioYellow) {
      return "warning";
    } else {
      //if (remainingTokens > maxTokensOrDefault * ratioGreen) {
      return "success";
    }
  }, [maxTokensOrDefault, remainingTokens]);

  return (
    <Tooltip
      color={color}
      variant="outlined"
      title={`200 tokens ≈ 150 words. You have ${remainingTokens} tokens remaining. ${
        remainingTokens > 0
          ? color === "danger"
            ? "Your goal may be too short."
            : color === "warning"
            ? "Your goal may be a bit short."
            : "Your goal is sufficiently long."
          : "Errors are more likely to occur with very long goals."
      }`}
    >
      <Chip
        {...props}
        size="sm"
        color={color}
        sx={{
          borderRadius: "2px",
          fontSize: { xs: "6pt", sm: "sm" },
          paddingX: { xs: "0.1rem", sm: "0.25rem" },
          textAlign: "center",
          cursor: "pointer",
        }}
        variant="outlined"
        component={Stack}
      >
        <>
          <Typography level="title-sm" fontSize={"9pt"}>
            TOKENS
          </Typography>
          <Typography level="body-sm" fontSize={"9pt"} color={color}>
            {remainingTokens}/{maxTokensOrDefault}
          </Typography>
        </>
      </Chip>
    </Tooltip>
  );
};
