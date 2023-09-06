// features/MainLayout/index.tsx

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { type InferGetStaticPropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { Skeleton } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import GlobalStyles from "@mui/joy/GlobalStyles";
import LinearProgress from "@mui/joy/LinearProgress";
import { useColorScheme } from "@mui/joy/styles";

import { app } from "~/constants";
import { type getStaticProps } from "~/pages/goal/[[...goal]]";
import useApp from "~/stores/appStore";

const Alerts = lazy(() => import("../Alerts/Alerts"));
const ErrorSnackbar = lazy(() => import("../Alerts/ErrorSnackbar"));
const GoalTabs = lazy(() => import("../WaggleDance/components/GoalTabs"));
const Footer = lazy(() => import("./components/Footer"));
const Header = lazy(() => import("./components/Header"));

type Props = InferGetStaticPropsType<typeof getStaticProps> & {
  children: React.ReactNode;
};

const MainLayout = ({ children, alertConfigs }: Props) => {
  const { mode } = useColorScheme();
  const { isPageLoading } = useApp();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
    if (mode) {
      if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
      }
      if (document.body.classList.contains("light")) {
        document.body.classList.remove("light");
      }
      if (document.body.classList.contains("system")) {
        document.body.classList.remove("system");
      }
      document.body.classList.add(mode);
    }
  }, [router, mode]);

  const pageOpacity = useMemo(() => {
    return isPageLoading ? 50 : 100;
  }, [isPageLoading]);

  if (!mounted) {
    return null;
  }
  return (
    <Box className={`xs:pt-0 overflow-clip sm:pt-2`}>
      <Box
        className={`overflow-x-clip overflow-y-scroll px-2 pb-2`}
        sx={{
          height: "calc(100dvh + env(safe-area-inset-bottom))",
          minHeight: "calc(100dvh + env(safe-area-inset-bottom))",
        }}
      >
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="theme-color"
            content={mode === "dark" ? "#2e1900" : "#FAB561"}
          />
          <meta
            name="viewport"
            content="initial-scale=1, viewport-fit=cover width=device-width height=device-height"
          />
          <meta name="apple-mobile-web-app-title" content={app.name} />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content={mode === "dark" ? "black-translucent" : "default"}
          />
        </Head>

        <GlobalStyles
          styles={(_theme) => ({
            ":root": {
              "--Header-height": "2.9rem",
            },
          })}
        />
        <Card
          className=" mx-auto md:max-w-screen-lg xl:max-w-screen-lg"
          sx={(theme) => ({
            borderRadius: "lg",
            shadowRadius: "xl",
            backgroundColor: theme.palette.background.backdrop,
            backdropFilter: "blur(3px)",
          })}
          variant="soft"
        >
          <Suspense
            fallback={
              <Skeleton variant="rectangular" width={"100%"} height={60} />
            }
          >
            <Header />
          </Suspense>
          <Card
            invertedColors
            color="primary"
            variant="outlined"
            className="-m-2 p-0"
            sx={{
              borderRadius: "lg",
              paddingBottom: 0,
              zIndex: 1,
              opacity: pageOpacity,
            }}
          >
            <Suspense
              fallback={
                <Skeleton variant="rectangular" width="100%" height={80} />
              }
            >
              <Alerts alertConfigs={alertConfigs} />
            </Suspense>
            <Suspense
              fallback={
                <Skeleton variant="rectangular" width="100%" height={30} />
              }
            >
              <GoalTabs>
                <LinearProgress
                  thickness={3}
                  sx={{ visibility: isPageLoading ? "visible" : "hidden" }}
                  color="neutral"
                />
                {children}
              </GoalTabs>
            </Suspense>
          </Card>
          <Suspense
            fallback={
              <Skeleton variant="rectangular" width={210} height={60} />
            }
          >
            <Footer
              className="xs:scale-75 sticky bottom-0 flex w-full pb-2 pt-10 md:scale-100"
              style={{
                bottom: "calc(env(safe-area-inset-bottom))",
              }}
            />
          </Suspense>
        </Card>
      </Box>
      <ErrorSnackbar />
    </Box>
  );
};

export default MainLayout;
