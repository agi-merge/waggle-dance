import { Close } from "@mui/icons-material";
import {
  Alert,
  Divider,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";

import useGoal, { GoalInputState } from "~/stores/goalStore";
import GoalDoctorModal from "./components/GoalDoctorModal";

const GoalMenu = () => {
  const { goal, setGoalInputState, setGoal } = useGoal();
  return (
    <>
      {goal && (
        <>
          <Divider orientation="vertical" className="m-2" />
          <Alert
            className="min-w-xs mt-0" // -m-3 ml-3 mt-0
            key="goal"
            sx={{ alignItems: "flex-start", margin: { xs: -1, sm: 0 } }}
            variant="plain"
            color="info"
            endDecorator={
              <IconButton
                variant="plain"
                size="sm"
                className="-m-3"
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
                {`${goal.slice(0, goal.length > 55 ? 55 : goal.length)}${
                  goal.length > 55 ? "…" : ""
                }`}
                <br />
                <Stack direction="row" gap="0.25rem">
                  <Tooltip title="Coming soon!" color="info">
                    <Link
                      variant="plain"
                      color="neutral"
                      level="body4"
                      className="flex-shrink"
                      // onClick={() => setOpen(true)}
                    >
                      ✏️ Edit
                    </Link>
                  </Tooltip>
                  <Divider orientation="vertical" />
                  <GoalDoctorModal>Coming soon!</GoalDoctorModal>
                </Stack>
              </Typography>
            </Stack>
          </Alert>
        </>
      )}
    </>
  );
};

export default GoalMenu;
