import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Breadcrumbs,
  Card,
  Chip,
  Divider,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { app } from "~/constants";
import ThemeToggle from "../../components/ThemeToggle";

const Header = () => {
  const router = useRouter();
  const { slug } = router.query;

  const { data: session } = useSession();

  const routes = [
    { path: "", label: "🐝 Start" },
    { path: "add-documents", label: "🌺 Enrich " },
    { path: "waggle-dance", label: "💃 Waggle" },
    { path: "goal-done", label: "🍯 Done" },
  ];

  const isActive = (path) => {
    if ((path === "" || path == "/") && slug !== "goal-done") return true;
    if (
      path === "add-documents" &&
      (slug === "" || slug === "add-documents" || slug === "waggle-dance")
    )
      return true;
    if (
      path === "waggle-dance" &&
      (slug === "add-documents" || slug === "waggle-dance")
    )
      return true;
    if (path === "goal-done" && slug === "goal-done") return true;
    return false;
  };

  const renderBreadcrumbLink = (path, label) => {
    const isHighlighted = slug === path || (slug?.length ?? 0) < 1;
    if (isActive(path)) {
      return (
        <Link href={`/${path}`} key={path}>
          <Typography
            component="a"
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
        <Typography
          key={path}
          level="body3"
          color="neutral"
          className="cursor-default opacity-50"
        >
          {label}
        </Typography>
      );
    }
  };

  const isHomeSlug = (slug?.length ?? 0) === 0;

  return (
    <header>
      <Sheet className="w-xl m-0 w-full max-w-xl p-1 ">
        <Stack direction="row" className="items-center">
          <Stack className="flex-grow pr-5">
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
            Automate complex tasks with{" "}
            <Tooltip title="I swear it is a thing" color="info">
              <a
                href="https://wikipedia.org/wiki/Waggle_dance"
                className="font-bold"
                target="_blank"
              >
                wagglin' swarms{" "}
              </a>
            </Tooltip>
            of instances of GPT.
          </Typography>
        )}

        <Breadcrumbs separator={<KeyboardArrowRight />} className="" size="sm">
          {routes.map((route) => renderBreadcrumbLink(route.path, route.label))}
        </Breadcrumbs>
        <Divider />
      </Sheet>
    </header>
  );
};

export default Header;
