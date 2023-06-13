import React, { useMemo } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { app } from "~/constants";
import ThemeToggle from "./ThemeToggle";

function removeFirstCharIfMatching(str: string, targetChar: string): string {
  return str && str.length > 0 && str[0] === targetChar ? str.slice(1) : str;
}

const routes = {
  "": {
    path: "/" as RoutePath,
    label: "🐝 Start",
  },
  // {
  //   path: "add-documents",
  //   label: "🌺 Data ",
  //   goalState: GoalInputState.refine,
  // },
  "waggle-dance": {
    path: "waggle-dance" as RoutePath,
    label: "💃 Waggle",
  },
  "goal-done": {
    path: "goal-done" as RoutePath,
    label: "🍯 Done",
  },
};

type RoutePath = "" | "waggle-dance" | "goal-done";
const Header = ({}) => {
  const router = useRouter();
  const slug = removeFirstCharIfMatching(router.pathname, "/");
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const activeIndex = useMemo(() => {
    return Object.keys(routes).findIndex((path) => path === slug);
  }, [slug]);

  const renderBreadcrumbLink = (
    path: RoutePath,
    label: string,
    index: number,
    activeIndex: number,
  ) => {
    const isHighlighted = index <= activeIndex;
    const isLink = index != activeIndex && isHighlighted;
    const isCurrent = index === activeIndex;
    // const _handleStateChange = () => {
    //   setGoalInputState(goalState ?? GoalInputState.start);
    // };
    // const route = routes[path];
    // const isHighlighted = goalState <= route.goalState;
    const labelElement = isHighlighted ? (
      <Typography
        key={path}
        sx={{ cursor: isCurrent ? "default" : "pointer" }}
        component="span"
        level="body3"
        color={isCurrent ? "primary" : "neutral"}
        className={isHighlighted ? "font-bold" : ""}
      >
        {label}
      </Typography>
    ) : (
      <Typography
        key={path}
        level="body3"
        color="neutral"
        className="cursor-default opacity-50"
      >
        {label}
      </Typography>
    );
    return (
      <Box key={path}>
        {isLink ? (
          <NextLink
            href={path}
            passHref
            color={isCurrent ? "primary" : "neutral"}
            className="cursor-pointer"
          >
            {labelElement}
          </NextLink>
        ) : (
          labelElement
        )}
      </Box>
    );
  };

  const isHomeSlug = (slug?.length ?? 0) === 0;

  const handleAvatarClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAvatarClose = () => {
    setAnchorEl(null);
  };

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
                <span onClick={handleAvatarClick}>
                  <Avatar
                    className="mr-3"
                    src={session.user.image || undefined}
                    alt={session.user.name || undefined}
                  />
                </span>
              </Link>
            </Tooltip>
          )}
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleAvatarClose}
            aria-labelledby="basic-demo-button"
          >
            {/* <MenuItem onClick={handleAvatarClose}>😀 Profile</MenuItem>
            <MenuItem onClick={handleAvatarClose}>🧾 My account</MenuItem> */}
            <MenuItem
              onClick={() => {
                void router.push("/auth/signout");
                handleAvatarClose();
              }}
            >
              👋 Logout
            </MenuItem>
          </Menu>
          <ThemeToggle />
        </Stack>
      </Stack>
      {isHomeSlug && (
        <Typography
          className="pl-2 pt-3"
          level="body2"
          fontSize={{ xs: "8pt", sm: "10pt" }}
          color="neutral"
        >
          Automate boring, complex tasks with the help of{" "}
          <Tooltip title="I swear it is a thing" color="info">
            <a
              href="https://wikipedia.org/wiki/Waggle_dance"
              className="font-bold"
              target="_blank"
            >
              wagglin&apos; swarms{" "}
            </a>
          </Tooltip>
          of large language model agents
        </Typography>
      )}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap="0.5rem"
        fontSize="body4"
        className="flex justify-center"
      >
        <Breadcrumbs
          separator={<KeyboardArrowRight />}
          className="mb-2 mt-4 flex flex-grow"
          size="sm"
        >
          {Object.values(routes).map((route, i) =>
            renderBreadcrumbLink(route.path, route.label, i, activeIndex),
          )}
        </Breadcrumbs>
      </Stack>
    </header>
  );
};

export default Header;
