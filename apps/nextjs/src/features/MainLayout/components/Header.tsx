import React, { useMemo } from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { KeyboardArrowRight, MoreVert } from "@mui/icons-material";
import {
  Avatar,
  Box,
  Breadcrumbs,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { app } from "~/constants";
import useGoalStore from "~/stores/goalStore";
import ThemeToggle from "./ThemeToggle";

const routes = {
  "/goal/new": {
    path: "/goal/new" as RoutePath,
    label: "🐝 Start",
  },
  "waggle-dance": {
    path: "waggle-dance" as RoutePath,
    label: "💃 Waggle",
  },
  "goal-done": {
    path: "goal-done" as RoutePath,
    label: "🍯 Done",
  },
};

type RoutePath = "/" | "waggle-dance" | "goal-done";
const Header = ({}) => {
  const router = useRouter();
  const { slug } = router.query;
  const { data: session } = useSession();
  const { getSelectedGoal } = useGoalStore();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isOpen) {
      event.preventDefault();
      setAnchorEl(null);
      return;
    }

    setAnchorEl(event.currentTarget);
  };
  const cleanedSlug = useMemo(() => {
    if (typeof slug === "string") {
      return slug;
    } else if (Array.isArray(slug)) {
      return slug[0];
    } else {
      return slug;
    }
    return "";
  }, [slug]) as string;

  const activeIndex = useMemo(() => {
    if (cleanedSlug === "new") {
      return 0;
    }
    const selectedGoal = getSelectedGoal(cleanedSlug);
    if (
      (selectedGoal?.executions.length ?? 0) === 0 &&
      (selectedGoal?.userId ?? "") === ""
    ) {
      return 0;
    } else {
      return 1;
    }
    // return Object.keys(routes).findIndex((path) => path === slug);
  }, [cleanedSlug, getSelectedGoal]);

  const renderBreadcrumbLink = (
    path: RoutePath,
    label: string,
    index: number,
    activeIndex: number,
  ) => {
    const isHighlighted = index <= activeIndex;
    const isLink = isHighlighted;
    const isCurrent = index === activeIndex;

    const labelElement = isHighlighted ? (
      <Typography
        key={path}
        component="span"
        level="body3"
        fontSize={{ xs: "7pt", sm: "9pt" }}
        color={isCurrent ? "primary" : "neutral"}
        className={isHighlighted ? "font-bold" : ""}
      >
        {label}
      </Typography>
    ) : (
      <Typography
        key={path}
        level="body3"
        fontSize={{ xs: "7pt", sm: "9pt" }}
        color="neutral"
        className="cursor-default opacity-50"
      >
        {label}
      </Typography>
    );
    return (
      <Box key={path}>
        {isLink ? (
          <NextLink href={path} shallow={true}>
            {labelElement}
          </NextLink>
        ) : (
          labelElement
        )}
      </Box>
    );
  };

  const isHomeSlug = activeIndex === 0;

  return (
    <header className="z-10 mx-auto w-full px-5 pt-0">
      <Stack
        direction="row"
        className="items-center"
        sx={{ paddingTop: { xs: 1, sm: 3 } }}
      >
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
        <IconButton
          id="menu-button"
          aria-controls={isOpen ? "main-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={isOpen ? "true" : undefined}
          variant="outlined"
          color="neutral"
          onClick={handleOpen}
        >
          <MoreVert />
        </IconButton>
        <Menu
          id="main-menu"
          variant="outlined"
          anchorEl={anchorEl}
          open={isOpen}
          aria-labelledby="menu-button"
        >
          <MenuItem orientation="vertical">
            <ThemeToggle />
          </MenuItem>
          <MenuItem orientation="vertical">
            {session?.user ? (
              <Tooltip title={`${session.user.name} has 100 credits`}>
                <Link>
                  <span onClick={handleOpen}>
                    <Avatar
                      className="mr-3"
                      src={session.user.image || undefined}
                      alt={session.user.name || undefined}
                    />
                  </span>
                </Link>
              </Tooltip>
            ) : (
              <Typography className="p-2">
                <NextLink href="/api/auth/signin">Sign in/up</NextLink>
              </Typography>
            )}
          </MenuItem>
        </Menu>
      </Stack>
      {isHomeSlug && (
        <Typography
          sx={{
            margin: { xs: 0, sm: 0.5 },
            paddingTop: { xs: 0.5, sm: 1 },
            paddingLeft: { xs: 1, sm: 1 },
            paddingBottom: 0,
            marginBottom: { xs: -2, sm: 1 },
          }}
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
              rel="noopener noreferrer"
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
