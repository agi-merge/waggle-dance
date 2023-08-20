// _app.tsx
import "../styles/globals.css";

import { useCallback, useEffect } from "react";
import type { AppType } from "next/app";
import { useRouter } from "next/router";
import Script from "next/script";
import { CssVarsProvider } from "@mui/joy/styles";
import { Analytics } from "@vercel/analytics/react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";
import theme from "~/styles/theme";
import { env } from "~/env.mjs";
import useApp from "~/stores/appStore";

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
      <Analytics />
      {env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      )}
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
