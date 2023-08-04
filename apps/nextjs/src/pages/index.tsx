// pages/index.tsx

import { Tooltip, Typography } from "@mui/joy";

import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";

export const HomeContent = () => {
  return (
    <>
      <Title title="🐝 Goal solver">
        <Typography level="body-md">
          Automate boring, complex tasks with the help of{" "}
          <Tooltip title="I swear it is a thing" variant="soft" color="neutral">
            <a
              href="https://wikipedia.org/wiki/Waggle_dance"
              className="font-bold"
              target="_blank"
              rel="noopener noreferrer"
            >
              wagglin&apos; swarms{" "}
            </a>
          </Tooltip>
          of large language model agents
        </Typography>
      </Title>
      <GoalInput />
    </>
  );
};
export default function Home() {
  return (
    <MainLayout>
      <HomeContent />
    </MainLayout>
  );
}
