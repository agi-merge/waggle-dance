import "../styles/globals.css";
import type { AppType } from "next/app";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import "tw-elements/dist/css/tw-elements.min.css";
import Button from "@mui/joy/Button";
import { CssVarsProvider, extendTheme } from "@mui/joy/styles";

import { api } from "~/utils/api";

const mantineTheme = extendTheme({
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

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <CssVarsProvider theme={mantineTheme} defaultMode="system">
        <Component {...pageProps} />
      </CssVarsProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
