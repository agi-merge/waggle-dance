import React from "react";
import NextLink from "next/link";
import { ClickAwayListener } from "@mui/base";
import { MoreVert } from "@mui/icons-material";
import Avatar from "@mui/joy/Avatar";
import IconButton from "@mui/joy/IconButton";
import Menu from "@mui/joy/Menu";
import MenuItem from "@mui/joy/MenuItem";
import Stack from "@mui/joy/Stack";
import Tooltip from "@mui/joy/Tooltip";
import Typography from "@mui/joy/Typography";
import { signOut, useSession } from "next-auth/react";

import { app } from "~/constants";
import routes from "~/utils/routes";
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";

const Header = ({}) => {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClose = (e?: MouseEvent | TouchEvent | undefined) => {
    e?.preventDefault();
    setAnchorEl(null);
    setIsOpen(false);
  };

  return (
    <header className="mx-auto w-full px-5 pb-2 pt-0">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          paddingTop: {
            xs: "calc(env(safe-area-inset-top) + 1rem)",
          },
          paddingBottom: { xs: 1 },
        }}
      >
        <Typography
          className="flex-grow"
          fontSize={{ xs: "1rem" }}
          level="title-lg"
          fontWeight={400}
        >
          🐝💃 waggledance.ai
          <Typography level="body-xs" className="pl-2">
            {app.version}
          </Typography>
        </Typography>
        {session && (
          <Tooltip title={`You are signed in as ${session.user?.name}`}>
            <IconButton onClick={() => void signOut()} size="sm">
              <Avatar
                className="mr-3"
                src={session.user?.image || undefined}
                alt={session.user?.name || undefined}
              />
            </IconButton>
          </Tooltip>
        )}
        <IconButton
          aria-haspopup="menu"
          id="menu-button"
          aria-controls={"main-menu"}
          aria-expanded={isOpen}
          variant="outlined"
          color="neutral"
          size="sm"
          onClick={(event) => {
            event.preventDefault();
            setAnchorEl(event.currentTarget);
            setIsOpen(!isOpen);
          }}
        >
          <MoreVert />
        </IconButton>
        {isOpen && (
          <ClickAwayListener
            mouseEvent={isOpen ? "onClick" : false}
            touchEvent={isOpen ? "onTouchStart" : false}
            onClickAway={handleClose} // Make sure handleClose is properly bound here
          >
            <>
              <Menu
                id="main-menu"
                variant="outlined"
                anchorEl={anchorEl}
                open={isOpen}
                onClose={handleClose}
                aria-labelledby="menu-button"
              >
                <MenuItem orientation="vertical">
                  <ThemeToggle />
                </MenuItem>
                <MenuItem orientation="vertical">
                  {session?.user ? (
                    <Tooltip
                      title={`You are signed in as ${session.user.name}`}
                    >
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
            </>
          </ClickAwayListener>
        )}
      </Stack>
    </header>
  );
};

export default Header;
