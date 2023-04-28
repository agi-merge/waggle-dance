import React, { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
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
        <Stack className="flex-grow pr-5">
          <Typography level="h2">
            waggle🐝<Typography>💃dance</Typography>
          </Typography>
          <Typography level="body5" className="pl-2">
            {app.version}
          </Typography>
        </Stack>
        <Stack direction="row" spacing="10">
          {session?.user && (
            <Tooltip title={`${session.user.name} has 100 credits`}>
              <Link>
                <Avatar
                  className="mr-3"
                  src={session.user.image || undefined}
                  alt={session.user.name || undefined}
                />
              </Link>
            </Tooltip>
          )}
          <DarkModeToggle />
        </Stack>
      </Stack>
      <Typography className="m-2">
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
      </Typography>
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
