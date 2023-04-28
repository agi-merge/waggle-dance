import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import {
  Avatar,
  Breadcrumbs,
  Card,
  Link,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { getInitColorSchemeScript, useColorScheme } from "@mui/joy/styles";
import { signIn, signOut } from "next-auth/react";

import { api, type RouterOutputs } from "~/utils/api";
import DarkModeToggle from "~/components/darkModeToggle";
import GoalInput, { GoalInputState } from "~/components/goalInput";
import { app } from "~/constants";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

const Home: NextPage = () => {
  const { mode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);
  const [goalInputState, setGoalInputState] = React.useState(
    GoalInputState.editing,
  );

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    console.log("Goal set:", goal);
    if (goal.trim().length > 0) {
      setGoalInputState(GoalInputState.running);
    } else {
      setGoalInputState(GoalInputState.editing);
    }
    // Do something with the goal, e.g., setState or call an API
  };
  // necessary for server-side rendering
  // because mode is undefined on the server
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <div className={mode === "dark" ? "dark" : "light"}>
      {getInitColorSchemeScript()}
      <div className="bg-honeycomb">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main className="mx-10 flex h-screen flex-col items-center text-white">
          <Sheet
            variant="outlined"
            className="my-5 items-center"
            sx={{
              borderRadius: "md",
            }}
            invertedColors
          >
            <Stack className="m-5">
              <Stack direction="row" className="">
                <Typography level="h1" className="flex-grow pr-5">
                  waggle🐝<Typography>💃dance</Typography>
                </Typography>
                <DarkModeToggle />
              </Stack>
              <GoalInput
                state={goalInputState}
                callbacks={{
                  setGoal: handleSetGoal,
                  onStop: () => {
                    setGoalInputState(GoalInputState.editing);
                  },
                }}
              />
            </Stack>
          </Sheet>
        </main>
      </div>
    </div>
  );
};

export default Home;
