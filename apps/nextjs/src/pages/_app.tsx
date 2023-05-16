/* eslint-disable @typescript-eslint/no-empty-function */
import "../styles/globals.css";
import { useCallback, useEffect } from "react";
import type { AppType } from "next/app";
import { useRouter } from "next/router";
import {
  CssVarsProvider,
  extendTheme,
  getInitColorSchemeScript,
} from "@mui/joy/styles";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";
import theme from "~/styles/theme";
import MainLayout from "~/features/MainLayout";
import useApp from "~/stores/appStore";

const _mantineTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          solidBg: "#228be6",
          solidHoverBg: "#1c7ed6",
          solidActiveBg: undefined,
          softColor: "#228be6",
          softBg: "rgba(231, 245, 255, 1)",
          softHoverBg: "rgba(208, 235, 255, 0.65)",
          softActiveBg: undefined,
          outlinedColor: "#228be6",
          outlinedBorder: "#228be6",
          outlinedHoverBg: "rgba(231, 245, 255, 0.35)",
          outlinedHoverBorder: undefined,
          outlinedActiveBg: undefined,
        },
      },
    },
  },
  fontFamily: {
    body: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji",
  },
  focus: {
    default: {
      outlineWidth: "2px",
      outlineOffset: "2px",
      outlineColor: "#339af0",
    },
  },
  components: {
    JoyButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          transition: "initial",
          borderRadius: "4px",
          fontWeight: 600,
          ...(ownerState.size === "md" && {
            minHeight: "36px",
            fontSize: "14px",
            paddingInline: "18px",
          }),
          "&:active": {
            transform: "translateY(1px)",
          },
        }),
      },
    },
  },
});

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
      {getInitColorSchemeScript()}
      <RouteControllerProvider>
        <CssVarsProvider theme={theme}>
          <MainLayout>
            <Component {...pageProps} />
          </MainLayout>
        </CssVarsProvider>
      </RouteControllerProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
