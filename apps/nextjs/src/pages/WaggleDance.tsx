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
      {/* <Card> */}
      <Stack gap="2rem">
        <Typography className="mb-2" level="body1">
          Goal: <Typography level="body2">{goal}</Typography>
        </Typography>

        <ChainGraph goal={goal} />
        {/* </Card> */}
      </Stack>
    </>
  );
};

export default WaggleDance;
