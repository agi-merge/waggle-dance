// WaggleDance.tsx
import React, { useEffect } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Card } from "@mui/joy";

import PageTitle from "~/features/MainLayout/components/PageTitle";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoal from "~/stores/goalStore";

// interface WaggleDanceProps {
//   goal: string;
//   onDelete?: () => void;
// }
// AKA goal solver
const WaggleDance: NextPage = (/*{ goal, onDelete }: WaggleDanceProps*/) => {
  const router = useRouter();
  const { goal } = useGoal();

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      void router.push("/");
    }
  }, [goal, router]);

  return (
    <Card variant="soft" className="mb-3">
      <PageTitle
        title="💃 Waggle Dance"
        description="Waggle dancing is a process that allows large language models like
              GPT-4 to collaborate with one another, with minimal human input.
              The AI breaks the steps to achieve the goal down, and
              self-corrects when it makes mistakes. This goes further, faster
              than BabyAGI, AgentGPT or Auto-GPT."
      />
      <WaggleDanceGraph />
    </Card>
  );
};

export default WaggleDance;
