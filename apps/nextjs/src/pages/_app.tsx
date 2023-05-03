import "../styles/globals.css";
import { createContext, useContext, useEffect, useState } from "react";
import type { AppType } from "next/app";
import {
  CssVarsProvider,
  extendTheme,
  getInitColorSchemeScript,
} from "@mui/joy/styles";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";
import theme from "~/styles/theme";

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

export enum GoalInputState {
  start,
  refine,
  configure,
  run,
  done,
}
// Really, this is a GoalContext, or something else.
// We can use it in a more targeted manner once we have multiple flows within the app.
const AppContext = createContext({
  goal: "",
  setGoal: (goal: string) => {},
  goalInputState: GoalInputState.start,
  setGoalInputState: (state: GoalInputState) => {},
});

export const useAppContext = () => useContext(AppContext);

export const StateProvider = ({ children }) => {
  const [goal, setGoal] = useState("");
  const [goalInputState, setGoalInputState] = useState(GoalInputState.start);

  return (
    <AppContext.Provider
      value={{ goal, setGoal, goalInputState, setGoalInputState }}
    >
      {children}
    </AppContext.Provider>
  );
};

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      {getInitColorSchemeScript()}
      <StateProvider>
        <CssVarsProvider theme={theme}>
          <Component {...pageProps} />
        </CssVarsProvider>
      </StateProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
