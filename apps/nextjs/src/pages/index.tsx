import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  Divider,
  Link,
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/joy";
import { getInitColorSchemeScript, useColorScheme } from "@mui/joy/styles";
import { signIn, signOut, useSession } from "next-auth/react";

import { api, type RouterOutputs } from "~/utils/api";
import DarkModeToggle from "~/components/DarkModeToggle";
import GoalInput from "~/components/GoalInput";
import Header from "~/components/Header";
import { app } from "~/constants";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

export enum GoalInputState {
  editing,
  running,
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
                  setGoalInputState(GoalInputState.editing);
                },
              }}
            />
          </Sheet>
          {goalInputState === GoalInputState.running && (
            <Card>
              <Tabs
                aria-label="Basic tabs"
                defaultValue={0}
                sx={{ borderRadius: "lg" }}
              >
                <TabList>
                  <Tab>First tab</Tab>
                  <Tab>Second tab</Tab>
                  <Tab>Third tab</Tab>
                </TabList>
                <TabPanel value={0} sx={{ p: 2 }}>
                  <b>First</b> tab panel
                </TabPanel>
                <TabPanel value={1} sx={{ p: 2 }}>
                  <b>Second</b> tab panel
                </TabPanel>
                <TabPanel value={2} sx={{ p: 2 }}>
                  <b>Third</b> tab panel
                </TabPanel>
              </Tabs>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
