import { Close } from "@mui/icons-material";
import {
  Alert,
  IconButton,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";

import useGoal, { GoalInputState } from "~/stores/goalStore";

const GoalMenu = () => {
  const { goal, setGoalInputState, setGoal } = useGoal();
  return (
    <>
      {goal && (
        <Alert
          className="w-xs"
          key="goal"
          sx={{ alignItems: "flex-start" }}
          variant="plain"
          color="info"
          endDecorator={
            <IconButton
              variant="plain"
              size="sm"
              onClick={() => {
                setGoal("");
                setGoalInputState(GoalInputState.start);
              }}
            >
              <Close />
            </IconButton>
          }
        >
          <Stack direction="column" className="p-0">
            <Typography level="body1">Goal:</Typography>
            <Typography level="body4">
              {goal}
              <br />
              <Tooltip title="Coming soon" color="info">
                <Link href="#">Improve your prompt</Link>
              </Tooltip>
            </Typography>
          </Stack>
        </Alert>
      )}
    </>
  );
};

export default GoalMenu;
