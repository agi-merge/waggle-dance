import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Breadcrumbs,
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

  const [routes, setRoutes] = useState({
    "": { label: "Goal", active: true },
    "add-documents": { label: "Add Docs", active: false },
    "waggle-dance": { label: "Waggle", active: false },
    "goal-done": { label: "Goal Done", active: false },
  });

  useEffect(() => {
    const updatedRoutes = {
      "": { label: "Goal", active: slug !== "goal-done" },
      "add-documents": {
        label: "Add Docs",
        active:
          slug === "" || slug === "add-documents" || slug === "waggle-dance",
      },
      "waggle-dance": {
        label: "Waggle",
        active: slug === "add-documents" || slug === "waggle-dance",
      },
      "goal-done": { label: "Goal Done", active: slug === "goal-done" },
    };
    setRoutes(updatedRoutes);
  }, [slug]);

  const renderBreadcrumbLink = (step, label, active) => {
    if (active) {
      return (
        <Link href={`/${step}`}>
          <Typography
            component="a"
            level="body2"
            color={slug === step ? "primary" : "neutral"}
            className={slug === step ? "font-bold" : ""}
          >
            {label}
          </Typography>
        </Link>
      );
    } else {
      return (
        <Typography
          level="body2"
          color="neutral"
          className="cursor-default opacity-50"
        >
          {label}
        </Typography>
      );
    }
  };

  return (
    <Sheet>
      <Stack direction="row" className="items-center">
        <Stack className="flex-grow pr-5">
          <Typography level="h1">
            waggle🐝<Typography>💃dance</Typography>
          </Typography>
          <Typography level="body5" className="pl-2">
            {app.version}
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
      <Typography className="pl-2 pt-3" level="body2" color="neutral">
        Automate complex tasks with{" "}
        <Tooltip title="I swear it is a thing" color="info">
          <a
            href="https://wikipedia.org/wiki/Waggle_dance"
            className="font-bold"
            target="_blank"
          >
            wagglin' 🐝 swarms{" "}
          </a>
        </Tooltip>
        of large language models.
      </Typography>

      <Breadcrumbs
        separator={<KeyboardArrowRight />}
        className="-ml-1"
        size="lg"
      >
        {Object.keys(routes).map((key) => (
          <span key={key}>
            {renderBreadcrumbLink(key, routes[key].label, routes[key].active)}
          </span>
        ))}
      </Breadcrumbs>
    </Sheet>
  );
};

export default Header;
