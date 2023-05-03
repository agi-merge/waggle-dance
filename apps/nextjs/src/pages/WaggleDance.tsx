// WaggleDance.tsx
import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Stack, Typography } from "@mui/joy";

import ChainGraph from "~/ChainGraph/components/ChainGraph";
import MainLayout from "~/MainLayout";
import { useAppContext } from "./_app";

// interface WaggleDanceProps {
//   goal: string;
//   onDelete?: () => void;
// }
// AKA goal solver
const WaggleDance: NextPage = (/*{ goal, onDelete }: WaggleDanceProps*/) => {
  const router = useRouter();
  const { goal } = useAppContext();
  return (
    <>
      <Typography level="body1">Waggle Dance</Typography>
      <Typography level="body3">
        Waggle dancing is a process that allows large language models like
        ChatGPT to collaborate with one another, with minimal human input. The
        AI breaks the steps to achieve the goal down, and self-corrects when it
        makes mistakes. This goes further, faster than BabyAGI, AgentGPT or
        Auto-GPT.
      </Typography>
      <br />
      <Stack gap="2rem">
        {goal && (
          <Typography className="mb-2" level="body1">
            Goal: <Typography level="body2">{goal}</Typography>
          </Typography>
        )}
        <ChainGraph goal={goal} />
      </Stack>
    </>
  );
};

export default WaggleDance;
