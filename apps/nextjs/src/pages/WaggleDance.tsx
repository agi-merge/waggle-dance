// WaggleDance.tsx
import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Card, Typography } from "@mui/joy";

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
    <MainLayout>
      <Typography>Waggle Dance</Typography>
      <Card>
        <Typography level="display2">Goal: {goal}</Typography>
        <ChainGraph goal={goal} />
      </Card>
    </MainLayout>
  );
};

export default WaggleDance;
