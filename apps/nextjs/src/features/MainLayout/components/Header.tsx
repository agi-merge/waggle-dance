import { useRouter } from "next/router";
import { Close, KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Breadcrumbs,
  IconButton,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import ThemeToggle from "~/components/ThemeToggle";
import { app } from "~/constants";
import useGoal, { GoalInputState } from "~/stores/goalStore";

function removeFirstCharIfMatching(str: string, targetChar: string): string {
  return str && str.length > 0 && str[0] === targetChar ? str.slice(1) : str;
}

const Header = () => {
  const router = useRouter();
  const { goal, setGoalInputState, setGoal } = useGoal();
  const slug = removeFirstCharIfMatching(router.pathname, "/");
  const { data: session } = useSession();
  const routes = [
    { path: "", label: "🐝 Start", goalState: GoalInputState.start },
    {
      path: "add-documents",
      label: "🌺 Pollinate ",
      goalState: GoalInputState.refine,
    },
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

    const handleStateChange = () => {
      setGoalInputState(goalState ?? GoalInputState.start);
    };

    if (isActive(path)) {
      return (
        <Link href={`/${path}`} key={path} onClick={handleStateChange}>
          <Typography
            component="span"
            level="body3"
            color={isHighlighted ? "primary" : "neutral"}
            className={isHighlighted ? "font-bold" : ""}
          >
            {label}
          </Typography>
        </Link>
      );
    } else {
      return (
        <Link href={`/${path}`} key={path} onClick={handleStateChange}>
          <Typography
            key={path}
            level="body3"
            color="neutral"
            className="cursor-default opacity-50"
          >
            {label}
          </Typography>
        </Link>
      );
    }
  };

  const isHomeSlug = (slug?.length ?? 0) === 0;

  return (
    <header className="z-10 mx-auto w-full px-5 pt-5">
      <Stack direction="row" className="items-center">
        <Stack className="flex-grow pl-2 pr-5">
          <Typography level={isHomeSlug ? "h3" : "h4"}>
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

      <Breadcrumbs
        separator={<KeyboardArrowRight />}
        className="mb-2"
        size="sm"
      >
        {routes.map((route) =>
          renderBreadcrumbLink(route.path, route.label, route.goalState),
        )}
      </Breadcrumbs>

      {goal && (
        <Sheet
          invertedColors
          className="mx-2 mt-2 p-2"
          variant="outlined"
          sx={{ borderRadius: "sm" }}
        >
          <Stack
            alignItems="center"
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 1, sm: 2, md: 4 }}
          >
            <Typography level="h5">Goal: </Typography>
            <Typography level="body4">
              {goal}
              <br />
              <Tooltip title="Coming soon" color="info">
                <Link href="#"> Improve your prompt</Link>
              </Tooltip>
            </Typography>
            <IconButton
              variant="soft"
              color="neutral"
              onClick={() => {
                setGoal("");
                setGoalInputState(GoalInputState.start);
              }}
            >
              <Close />
            </IconButton>
          </Stack>
        </Sheet>
      )}
    </header>
  );
};

export default Header;
