import { Typography } from "@mui/joy";

import Title from "~/features/MainLayout/components/PageTitle";
import GoalInput from "./GoalInput";

export const GoalPrompt = () => {
  return (
    <>
      <Title title="🐝 Goal solver">
        <Typography level="body-md">
          Automate complex tasks with a swarm of AI agents.
        </Typography>
      </Title>
      <GoalInput />
    </>
  );
};

export default GoalPrompt;
