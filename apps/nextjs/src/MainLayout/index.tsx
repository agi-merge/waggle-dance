import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Close, Warning } from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  Divider,
  IconButton,
  Sheet,
  Typography,
  useColorScheme,
} from "@mui/joy";

import { app } from "~/constants";
import { useAppContext } from "~/pages/_app";
import Header from "./components/Header";
import PageLoading from "./components/PageLoading";

const MainLayout = ({ children }) => {
  const { mode } = useColorScheme();
  const { goal } = useAppContext();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [systemAlertOpen, setSystemAlertOpen] = useState(true);

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
  }, [goal, router]);
  if (!mounted) {
    return null;
  }

  // useEffect(() => {}, [goal, router]);
  const color = "warning";
  const title = "Limited Demo";
  const description = "Core features are broken and are frequently changing.";
  const icon = <Warning />;
  return (
    <div
      className={mode === "dark" ? "bg-honeycomb dark" : "light bg-honeycomb"}
    >
      <div className="h-screen p-2 ">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta name="viewport" content="initial-scale=1, width=device-width" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        {systemAlertOpen && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              flexDirection: "column",
            }}
          >
            <Alert
              key={title}
              sx={{ alignItems: "flex-start" }}
              startDecorator={React.cloneElement(icon, {
                sx: { mt: "2px", mx: "4px" },
                fontSize: "xl2",
              })}
              variant="soft"
              color={color}
              endDecorator={
                <IconButton
                  variant="soft"
                  size="sm"
                  color={color}
                  onClick={() => {
                    setSystemAlertOpen(false);
                  }}
                >
                  <Close />
                </IconButton>
              }
            >
              <div>
                <Typography fontWeight="lg" mt={0.25}>
                  {title}
                </Typography>
                <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                  {description}
                </Typography>
              </div>
            </Alert>
          </Box>
        )}
        <Sheet
          // variant="outlined"
          className="full w-xl h-[min(full, 100vh)] mx-auto max-w-xl items-center p-5"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
        >
          <Header />
          <PageLoading />
          <Card className="w-full">{children}</Card>
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
