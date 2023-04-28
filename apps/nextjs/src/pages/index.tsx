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
import { app } from "~/constants";

const Home: NextPage = () => {
  const { mode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

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
          <Stack className="my-5 flex flex-col">
            <Card variant="outlined" className="items-center">
              <Stack direction="row">
                <Typography level="h1">
                  waggle🐝<Typography>💃dance</Typography>
                </Typography>
                <DarkModeToggle />
              </Stack>
            </Card>
          </Stack>
          <div className="container my-2 flex flex-col items-center justify-center gap-4 px-4 py-8"></div>
        </main>
      </div>
    </div>
  );
};

export default Home;
