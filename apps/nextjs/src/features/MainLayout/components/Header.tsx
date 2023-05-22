import React from "react";
import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Breadcrumbs,
  Card,
  LinearProgress,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { app } from "~/constants";
import useGoal, { GoalInputState } from "~/stores/goalStore";
import ThemeToggle from "./ThemeToggle";

function removeFirstCharIfMatching(str: string, targetChar: string): string {
  return str && str.length > 0 && str[0] === targetChar ? str.slice(1) : str;
}

const Header = () => {
  const router = useRouter();
  const { setGoalInputState } = useGoal();
  const slug = removeFirstCharIfMatching(router.pathname, "/");
  const { data: session } = useSession();
  const routes = [
    { path: "", label: "🐝 Start", goalState: GoalInputState.start },
    // {
    //   path: "add-documents",
    //   label: "🌺 Data ",
    //   goalState: GoalInputState.refine,
    // },
    {
      path: "waggle-dance",
      label: "💃 Waggle",
      goalState: GoalInputState.configure,
    },
    { path: "goal-done", label: "🍯 Done", goalState: GoalInputState.done },
  ];

  const isActive = (path: string) => {
    return path === slug;
  };

  const renderBreadcrumbLink = (
    path: string,
    label: string,
    goalState?: GoalInputState,
  ) => {
    const isHighlighted = slug === path || (slug?.length ?? 0) < 1;

    const _handleStateChange = () => {
      setGoalInputState(goalState ?? GoalInputState.start);
    };

    if (isActive(path)) {
      return (
        <Typography
          key={path}
          sx={{ cursor: "default" }}
          component="span"
          level="body3"
          color={isHighlighted ? "primary" : "neutral"}
          className={isHighlighted ? "font-bold" : ""}
        >
          {label}
        </Typography>
        // </Link>
      );
    } else {
      return (
        // <Link href={`/${path}`} key={path} onClick={handleStateChange}>
        <Typography
          key={path}
          level="body3"
          color="neutral"
          className="cursor-default opacity-50"
        >
          {label}
        </Typography>
        // </Link>
      );
    }
  };

  const isHomeSlug = (slug?.length ?? 0) === 0;

  return (
    <header className="z-10 mx-auto w-full px-5 pt-5">
      <Stack direction="row" className="items-center">
        <Stack className="flex-grow pl-2 pr-5">
          <Typography
            fontSize={{ xs: "15pt", sm: "24pt" }}
            level={isHomeSlug ? "h3" : "h4"}
          >
            waggle🐝<Typography>💃dance</Typography>
            <Typography level="body5" className="pl-2">
              {app.version}
            </Typography>
          </Typography>
        </Stack>
        <Stack direction="row" spacing="10">
          {session?.user && (
            <Tooltip title={`${session.user.name} has 100 credits`}>
              <Link>
                <Avatar
                  className="mr-3"
                  src={session.user.image || undefined}
                  alt={session.user.name || undefined}
                />
              </Link>
            </Tooltip>
          )}
          <ThemeToggle />
        </Stack>
      </Stack>
      {isHomeSlug && (
        <Typography className="pl-2 pt-3" level="body2" color="neutral">
          Automate your boring, complex tasks with the help of{" "}
          <Tooltip title="I swear it is a thing" color="info">
            <a
              href="https://wikipedia.org/wiki/Waggle_dance"
              className="font-bold"
              target="_blank"
            >
              wagglin&apos; swarms{" "}
            </a>
          </Tooltip>
          of AIs
        </Typography>
      )}
      <Tooltip title="Help keep waggle dance's free tier free">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap="0.5rem"
          fontSize="body4"
          className="mb-4 flex"
        >
          <Breadcrumbs
            separator={<KeyboardArrowRight />}
            className="mb-2 flex flex-grow"
            size="sm"
          >
            {routes.map((route) =>
              renderBreadcrumbLink(route.path, route.label, route.goalState),
            )}
          </Breadcrumbs>
          <Box
            className="m-0 flex min-w-fit flex-grow flex-col p-0"
            color="neutral"
          >
            <Typography level="body3">Global Free OpenAI Limit:</Typography>
            <Link
              className="flex flex-grow"
              color="neutral"
              target="_blank"
              href={app.routes.donate}
            >
              <LinearProgress
                determinate
                variant="outlined"
                color="neutral"
                size="sm"
                thickness={32}
                value={69}
                sx={{
                  "--LinearProgress-radius": "0px",
                  "--LinearProgress-progressThickness": "24px",
                  boxShadow: "sm",
                  borderColor: "neutral.500",
                }}
              >
                <Typography
                  level="body3"
                  fontWeight="xl"
                  textColor="common.white"
                  sx={{ mixBlendMode: "difference" }}
                >
                  $120 / $140
                </Typography>
              </LinearProgress>
            </Link>
          </Box>
        </Stack>
      </Tooltip>
    </header>
  );
};

export default Header;
