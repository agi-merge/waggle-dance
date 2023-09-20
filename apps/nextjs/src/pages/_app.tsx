// _app.tsx
import "../styles/globals.css";

import { Suspense, useCallback, useEffect } from "react";
import type { AppType } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { CssVarsProvider } from "@mui/joy/styles";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";
import theme from "~/styles/theme";
import useApp from "~/stores/appStore";

const Analytics = dynamic(() =>
  import("@vercel/analytics/react").then((mod) => mod.Analytics),
);
type RouteControllerProps = {
  children: React.ReactNode;
};

export const RouteControllerProvider = ({ children }: RouteControllerProps) => {
  const { setIsPageLoading } = useApp();
  const router = useRouter();

  const handleStart = useCallback(() => {
    setIsPageLoading(true);
  }, [setIsPageLoading]);

  const handleStop = useCallback(() => {
    setIsPageLoading(false);
  }, [setIsPageLoading]);

  useEffect(() => {
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleStop);
    router.events.on("routeChangeError", handleStop);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleStop);
      router.events.off("routeChangeError", handleStop);
    };
  }, [handleStart, handleStop, router]);

  return <>{children}</>;
};

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <RouteControllerProvider>
        <CssVarsProvider theme={theme} defaultMode="system">
          <Component {...pageProps} />
        </CssVarsProvider>
      </RouteControllerProvider>
      <Suspense>
        <Analytics />
      </Suspense>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
