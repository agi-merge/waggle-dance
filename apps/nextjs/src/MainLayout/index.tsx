import React, { useState } from "react";
import Head from "next/head";
import { Card, Divider, Sheet, useColorScheme } from "@mui/joy";

import { app } from "~/constants";
import Header from "./components/Header";

const MainLayout = ({ children }) => {
  const { mode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  // necessary for server-side rendering
  // because mode is undefined on the server
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }
  return (
    <div
      className={mode === "dark" ? "bg-honeycomb dark" : "light bg-honeycomb"}
    >
      <div className="h-screen">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Sheet
          variant="outlined"
          className="full w-xl mx-auto max-w-xl items-center p-5"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
        >
          <Header />
          <Divider />
          <Card className="mx-auto max-w-lg">{children}</Card>
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
