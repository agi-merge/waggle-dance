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
  const isAddDocumentsPage = router.pathname === "/add-documents";
  const isWaggleDancePage = router.pathname === "/waggle-dance";
  const isHomePage = !isAddDocumentsPage && !isWaggleDancePage;

  const { data: session } = useSession();

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
        <Typography
          color={isHomePage ? "primary" : "neutral"}
          className={isHomePage ? "font-bold" : ""}
        >
          Goal
        </Typography>
        <Typography
          level="body2"
          color={isAddDocumentsPage ? "primary" : "neutral"}
          className={isAddDocumentsPage ? "font-bold" : ""}
        >
          Add Docs
        </Typography>
        <Typography
          level="body2"
          color={isWaggleDancePage ? "primary" : "neutral"}
          className={isWaggleDancePage ? "font-bold" : ""}
        >
          Waggle
        </Typography>
        <Typography level="body2" color="neutral">
          Goal Done
        </Typography>
      </Breadcrumbs>
    </Sheet>
  );
};

export default Header;
