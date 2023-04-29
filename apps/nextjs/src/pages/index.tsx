import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { Card, Sheet } from "@mui/joy";
import { getInitColorSchemeScript, useColorScheme } from "@mui/joy/styles";

import GoalWorkspace from "~/components/GoalWorkspace";
import Header from "~/components/Header";
import GoalInput from "~/components/goalInput";
import { app } from "~/constants";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

export enum GoalInputState {
  start,
  refine,
  configure,
  run,
  done,
}

const Home: NextPage = () => {
  const { mode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);
  const [goalInputState, setGoalInputState] = React.useState(
    GoalInputState.start,
  );
  const [newGoal, setNewGoal] = React.useState("");

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    console.log("Goal set:", goal);
    if (goal.trim().length > 0) {
      setGoalInputState(GoalInputState.refine);
      setNewGoal(goal);
    } else {
      setGoalInputState(GoalInputState.start);
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
        <main className="flex h-screen flex-col items-center text-white">
          <Sheet
            variant="outlined"
            className="full my-5 items-center p-5"
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
                  setGoalInputState(GoalInputState.start);
                },
              }}
            />
          </Sheet>
          {goalInputState !== GoalInputState.start && (
            <Card>
              <GoalWorkspace goal={newGoal} />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
