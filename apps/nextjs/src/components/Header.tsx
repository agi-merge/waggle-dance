import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Avatar,
  Breadcrumbs,
  Card,
  Link,
  Sheet,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { app } from "~/constants";
import DarkModeToggle from "./DarkModeToggle";

const Header = () => {
  const { data: session } = useSession();

  return (
    <Sheet>
      <Stack direction="row" className="items-center">
        <Stack className="flex-grow pr-5">
          <Typography level="display2">
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
          <DarkModeToggle />
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

      <Breadcrumbs separator={<KeyboardArrowRight />} className="-ml-1">
        <Typography color="primary">Goal</Typography>
        <Typography level="body2" color="neutral">
          Add Docs
        </Typography>{" "}
        <Typography level="body2" color="neutral">
          Waggle
        </Typography>{" "}
        <Typography level="body2" color="neutral">
          Goal Done
        </Typography>
      </Breadcrumbs>
    </Sheet>
  );
};

export default Header;
