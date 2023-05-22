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
      <WaggleDanceGraph />
    </Card>
  );
};

export default WaggleDance;
