// pages/index.tsx

import dynamic from "next/dynamic";
import Link from "next/link";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";

import GoalPromptInput from "~/features/GoalPrompt/GoalPromptInput";
import Title from "~/features/MainLayout/components/PageTitle";

export const HomeContent = () => {
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
      <GoalPromptInput />
    </>
  );
};

const LazyGoalDynamicRoute = dynamic(() =>
  import("~/pages/goal/[[...goal]]").then((mod) => mod.default),
);

export default function Home() {
  return <LazyGoalDynamicRoute />;
}
