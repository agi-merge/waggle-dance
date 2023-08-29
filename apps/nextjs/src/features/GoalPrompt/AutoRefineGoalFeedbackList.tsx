import { useState } from "react";
import { Box, Typography, type BoxProps } from "@mui/joy";

import {
  type AutoRefineFeedback,
  type AutoRefineFeedbackType,
} from "@acme/api/utils";

type Props = BoxProps & object;

const colorForType = (type: AutoRefineFeedbackType) => {
  switch (type) {
    case "error":
      return "danger";
    case "warning":
      return "warning";
    case "enhancement":
      return "primary";
    case "pass":
      return "success";
  }
};

function AutoRefineFeedbackList({}: Props) {
  const [feedback, _setFeedback] = useState<[AutoRefineFeedback] | null>(null);

  // This useEffect hook could call the AutoRefineService to get feedback
  // on the current goal, and then update the state with the received feedback.
  // useEffect(() => {}, [goal]);

  if (!feedback) {
    return null;
  }

  return (
    <Box>
      {feedback.map((issue, index) => (
        <Typography
          key={`${index}${issue.message}`}
          color={colorForType(issue.type)}
        >
          {issue.message}
        </Typography>
      ))}
    </Box>
  );
}

export default AutoRefineFeedbackList;
