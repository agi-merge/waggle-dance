import React, { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, LinearProgress, Sheet, useColorScheme } from "@mui/joy";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { type CombinedResponse } from "~/utils/openAIUsageAPI";
import { app } from "~/constants";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import HistoryTabber from "../WaggleDance/components/HistoryTabber";
import Alerts from "./components/Alerts";
import Footer from "./components/Footer";
import Header from "./components/Header";
import OpenAIUsage from "./components/OpenAIUsage";

type Props = {
  children: React.ReactNode;
  openAIUsage?: CombinedResponse | null; // Add this prop
};

const MainLayout = ({ children, openAIUsage }: Props) => {
  const { mode } = useColorScheme();
  const { isPageLoading } = useApp();
  const { initializeHistoryData } = useGoalStore();
  const router = useRouter();
  const { goalMap } = useGoalStore();
  const [mounted, setMounted] = useState(false);

  const { data: sessionData } = useSession();
  const { data: historicGoals, refetch } = api.goal.topByUser.useQuery(
    undefined,
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        console.log("Mainlayout goal fetch onSuccess!", data);
      },
    },
  );

  // Initialize history data based on whether the user is logged in or not
  // If not, the + button will ask the user to log in
  useEffect(() => {
    const handleHistoricGoals = async () => {
      if (sessionData) {
        initializeHistoryData(sessionData, historicGoals);
        // avoid spamming errors
        await refetch();
      } else if (goalMap.size === 0) {
        initializeHistoryData(sessionData, historicGoals);
      }
    };
    void handleHistoricGoals();
  }, [sessionData, goalMap, historicGoals, initializeHistoryData, refetch]);

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
  }, [router]);
  const progressOpacity = useMemo(() => {
    return isPageLoading ? 100 : 0;
  }, [isPageLoading]);

  const pageOpacity = useMemo(() => {
    return isPageLoading ? 50 : 100;
  }, [isPageLoading]);

  if (!mounted) {
    return null;
  }
  return (
    <div className={`bg-honeycomb ${mode === "dark" ? " dark" : "light"}`}>
      <div className="max-h-screen min-h-screen overflow-y-auto px-2 pb-2">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="theme-color"
            content={mode === "dark" ? "#2e1900" : "#FAB561"}
          />
          <meta
            name="viewport"
            content="initial-scale=1, width=device-width, viewport-fit=cover"
          />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content={app.name} />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content={mode === "dark" ? "black" : "default"}
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Sheet
          className="mx-auto sm:mt-1 md:mt-2 md:max-w-screen-lg xl:max-w-screen-lg"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
          variant="soft"
        >
          <Header />
          <Card
            invertedColors
            color="primary"
            variant="outlined"
            className="-m-2 p-0"
            sx={{
              opacity: pageOpacity,
            }}
          >
            <Alerts />
            <HistoryTabber>
              <LinearProgress
                thickness={3}
                sx={{ opacity: progressOpacity }}
                color="neutral"
              />
              {children}
            </HistoryTabber>

            {openAIUsage && <OpenAIUsage openAIUsage={openAIUsage} />}
          </Card>
          <Footer />
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
