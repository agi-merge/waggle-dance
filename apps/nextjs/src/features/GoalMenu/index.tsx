import { Close } from "@mui/icons-material";
import {
  Alert,
  Card,
  Divider,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
  type CardProps,
} from "@mui/joy";

import useGoal, { GoalInputState } from "~/stores/goalStore";
import GoalDoctorModal from "./components/GoalDoctorModal";

const GoalMenu = ({}: CardProps) => {
  const { goal, setGoalInputState, setGoal } = useGoal();
  return (
    <Card>
      {goal && (
        <>
          <Divider orientation="vertical" className="m-2 ml-10" />
          <Alert
            className="min-w-xs mt-0" // -m-3 ml-3 mt-0
            key="goal"
            sx={{ alignItems: "flex-start", margin: { xs: -1, sm: 0 } }}
            variant="plain"
            color="info"
            endDecorator={
              <Tooltip title="Reset goal" color="danger">
                <IconButton
                  variant="plain"
                  size="sm"
                  color="danger"
                  className="-m-3"
                  onClick={() => {
                    setGoal("");
                    setGoalInputState(GoalInputState.start);
                  }}
                >
                  <Close />
                </IconButton>
              </Tooltip>
            }
          >
            <Stack direction="column" className="p-0">
              <Typography level="body1">Goal:</Typography>
              <Typography level="body4">
                {`${goal.slice(0, goal.length > 55 ? 55 : goal.length)}${
                  goal.length > 20 ? "…" : ""
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
    </Card>
  );
};

export default GoalMenu;
