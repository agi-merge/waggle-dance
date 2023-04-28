import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import {
  Avatar,
  Breadcrumbs,
  Card,
  Divider,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { getInitColorSchemeScript, useColorScheme } from "@mui/joy/styles";
import { signIn, signOut, useSession } from "next-auth/react";

import { api, type RouterOutputs } from "~/utils/api";
import DarkModeToggle from "~/components/darkModeToggle";
import GoalInput, { GoalInputState } from "~/components/goalInput";
import { app } from "~/constants";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

const Header = () => {
  const { data: session } = useSession();

  return (
    <Sheet>
      <Stack direction="row" className="">
        <Typography level="h1" className="flex-grow pr-5">
          waggle🐝<Typography>💃dance</Typography>
        </Typography>
        <Stack direction="row" spacing="10" className="mt-2">
          {session?.user && (
            <Avatar
              src={session.user.image || undefined}
              alt={session.user.name || undefined}
              className="mr-3 mt-2"
            />
          )}
          <DarkModeToggle />
        </Stack>
      </Stack>
      <p className="m-2">
        Complete complex tasks with{" "}
        <Tooltip title="I swear it is a thing" color="info">
          <a
            href="https://wikipedia.org/wiki/Waggle_dance"
            className="text-blue font-bold"
          >
            wagglin' 🐝 swarms{" "}
          </a>
        </Tooltip>
        of large language models.
      </p>
      <Divider />
    </Sheet>
  );
};

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
            className="my-5 items-center p-5"
            sx={{
              borderRadius: "lg",
              shadowRadius: "xl",
            }}
            invertedColors
          >
            <Header />
            <GoalInput
              state={goalInputState}
              callbacks={{
                setGoal: handleSetGoal,
                onStop: () => {
                  setGoalInputState(GoalInputState.editing);
                },
              }}
            />
          </Sheet>
        </main>
      </div>
    </div>
  );
};

export default Home;
