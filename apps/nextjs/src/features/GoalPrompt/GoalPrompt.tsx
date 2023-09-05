import { Link, Tooltip, Typography } from "@mui/joy";

import Title from "~/features/MainLayout/components/PageTitle";
import GoalInput from "./GoalInput";

export const GoalPrompt = () => {
  return (
    <>
      <Title title="🐝 Goal solver">
        <Typography level="body-md">
          Automate boring, complex tasks with the help of{" "}
          <Tooltip title="I swear it is a thing" variant="soft" color="neutral">
            <Link
              href="https://wikipedia.org/wiki/Waggle_dance"
              className="font-bold"
              target="_blank"
              rel="noopener noreferrer"
            >
              wagglin&apos; swarms{" "}
            </Link>
          </Tooltip>
          of large language model agents
        </Typography>
      </Title>
      <GoalInput />
    </>
  );
};

export default GoalPrompt;
