// features/MainLayout/index.tsx

import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { type InferGetStaticPropsType } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { Sheet, Skeleton, Stack } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import GlobalStyles from "@mui/joy/GlobalStyles";
import LinearProgress from "@mui/joy/LinearProgress";
import { useColorScheme } from "@mui/joy/styles";
import { useDebounce } from "use-debounce";

import { app } from "~/constants";
import { type getStaticProps } from "~/pages/goal/[[...goal]]";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";

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

  const goalStore = useGoalStore();
  const [debouncedGoalStore] = useDebounce(goalStore, 50);

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
    <Sheet
      className={`overflow-clip`}
      sx={(theme) => ({
        backgroundColor: theme.palette.background.backdrop,
        backdropFilter: "blur(2px)",
      })}
    >
      <Box
        className={`overflow-x-clip overflow-y-scroll`}
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
          className="mx-auto md:max-w-screen-lg xl:max-w-screen-lg"
          sx={(theme) => {
            const original = theme.palette.background.backdrop;
            const processed = theme.palette.background.backdrop.replace(
              "-darkChannel",
              "",
            );
            const shouldUseFallback = original.length === processed.length;

            return {
              borderRadius: "lg",
              shadowRadius: "xl",
              backgroundColor: shouldUseFallback
                ? "rgba(var(--joy-palette-neutral, 251 252 254) / 0.25);"
                : processed,
              backdropFilter: "blur(2px)",
            };
          }}
          variant="soft"
        >
          <Suspense
            fallback={
              <Skeleton variant="rectangular" width={"100%"} height="6rem" />
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
                <Skeleton variant="rectangular" width="100%" height="3rem" />
              }
            >
              <Alerts alertConfigs={alertConfigs} />
            </Suspense>

            <Suspense
              fallback={
                <Stack gap="1rem" component={Card}>
                  <Skeleton
                    variant="rectangular"
                    height="1rem"
                    width="100%"
                    animation="wave"
                    loading={true}
                  />
                  <Skeleton
                    variant="rectangular"
                    height="3rem"
                    width="100%"
                    animation="wave"
                    loading={true}
                  />
                  <Skeleton
                    sx={{ marginTop: "2.5rem" }}
                    variant="rectangular"
                    height="10rem"
                    width="100%"
                    animation="wave"
                    loading={true}
                  />

                  <Skeleton
                    variant="rectangular"
                    height="4rem"
                    width="25rem"
                    animation="wave"
                    loading={true}
                    sx={{ alignSelf: "end" }}
                  />
                </Stack>
              }
            >
              {" "}
              <GoalTabs goalStore={debouncedGoalStore}>
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
    </Sheet>
  );
};

export default MainLayout;
