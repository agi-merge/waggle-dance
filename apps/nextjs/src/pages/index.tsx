// pages/index.tsx

import Link from "next/link";
import { Tooltip, Typography } from "@mui/joy";

import GoalInput from "~/features/GoalMenu/components/GoalInput";
import Title from "~/features/MainLayout/components/PageTitle";
import GoalDynamicRoute from "~/pages/goal/[...slug]";

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
      <GoalInput />
    </>
  );
};

export default function Home() {
  return <GoalDynamicRoute />;
}
