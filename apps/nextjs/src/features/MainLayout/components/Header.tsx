import React from "react";
import NextLink from "next/link";
import { MoreVert } from "@mui/icons-material";
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";
import { signOut, useSession } from "next-auth/react";

import routes from "~/utils/routes";
import { app } from "~/constants";
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";

const Header = ({}) => {
  const { data: session } = useSession();
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

  return (
    <header className="mx-auto w-full px-5 pb-2 pt-0">
      <Stack
        direction="row"
        sx={{
          paddingTop: {
            xs: "calc(env(safe-area-inset-top) + 1rem)",
          },
          paddingBottom: { xs: 1 },
        }}
      >
        <Typography className="flex-grow" level="h1">
          waggle🐝<Typography>💃dance</Typography>
          <Typography level="body-xs" className="pl-2">
            {app.version}
          </Typography>
        </Typography>
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
              <Tooltip title={`You are signed in as ${session.user.name}`}>
                <IconButton onClick={() => void signOut()}>
                  <Avatar
                    className="mr-3"
                    src={session.user.image || undefined}
                    alt={session.user.name || undefined}
                  />
                </IconButton>
              </Tooltip>
            ) : (
              <Typography className="p-2">
                <NextLink href={routes.auth}>Sign in/up</NextLink>
              </Typography>
            )}
          </MenuItem>
          <MenuItem>
            <Footer />
          </MenuItem>
        </Menu>
      </Stack>
    </header>
  );
};

export default Header;
