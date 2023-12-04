import { Box, Typography } from "@mui/joy";
import type { BoxProps } from "@mui/joy";

import type {
  AutoRefineFeedback,
  AutoRefineFeedbackItem,
} from "@acme/api/utils";

type Props = BoxProps & {
  feedback: AutoRefineFeedback | null;
};

const colorForFeedback = (
  feedback: AutoRefineFeedbackItem | null | undefined,
) => {
  switch (feedback?.type) {
    case "error":
      return "danger";
    case "warning":
      return "warning";
    case "enhancement":
      return "primary";
    default:
      return "success";
  }
};

function AutoRefineFeedbackList({ feedback }: Props) {
  // This useEffect hook could call the AutoRefineService to get feedback
  // on the current goal, and then update the state with the received feedback.
  // useEffect(() => {}, [goal]);

  if (!feedback) {
    return null;
  }

  return (
    <Box>
      {feedback.feedback.map((issue, index) => (
        <Typography
          key={`${index}${issue.reason}`}
          color={colorForFeedback(issue)}
        >
          {issue.refinedGoal}
        </Typography>
      ))}
    </Box>
  );
}

export default AutoRefineFeedbackList;
