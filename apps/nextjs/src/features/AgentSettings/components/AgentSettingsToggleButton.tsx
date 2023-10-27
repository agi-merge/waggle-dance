import React from "react";
import { ClickAwayListener } from "@mui/base";
import {
  Box,
  Divider,
  Link,
  Menu,
  Stack,
  Typography,
  type CardProps,
} from "@mui/joy";

import AddDocuments from "~/features/AddDocuments/AddDocuments";
import DocsModal from "~/features/AddDocuments/components/DocsModal";
import SkillsModal from "~/features/Skills/components/SkillsModal";
import SkillSelect from "~/features/Skills/SkillSelect";
import AgentSettings from "../AgentSettings";

function AgentSettingsToggler({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClose = (e?: MouseEvent | TouchEvent | undefined) => {
    e?.preventDefault();
    setAnchorEl(null);
    setIsOpen(false);
  };

  return (
    <Stack direction="row" gap="0.5rem">
      <Box className="align-start flex flex-shrink">
        <DocsModal>
          <AddDocuments />
        </DocsModal>
        <Divider orientation="vertical" sx={{ marginX: "0.5rem" }} />
        <SkillsModal>
          <SkillSelect />
        </SkillsModal>
      </Box>
      <Divider orientation="vertical" />
      <>
        <Link
          className="m-0 mt-0 p-0"
          onClick={(event) => {
            event.preventDefault();
            setAnchorEl(event.currentTarget);
            setIsOpen(!isOpen);
          }}
          aria-haspopup="menu"
          id="agent-settings-button"
          aria-controls={"agent-settings-menu"}
          aria-expanded={isOpen}
        >
          <Typography level="body-sm" className="m-0 p-0">
            {isOpen ? "▼" : "▲"} Agent Settings
          </Typography>
        </Link>
        {isOpen && (
          <ClickAwayListener onClickAway={handleClose}>
            <Menu
              aria-labelledby="agent-settings-button"
              id="agent-settings-menu"
              anchorEl={anchorEl}
              open={isOpen}
              onClose={handleClose}
              placement="top-start"
              className="w-64"
            >
              {children}
            </Menu>
          </ClickAwayListener>
        )}
      </>
    </Stack>
  );
}

function AgentSettingsToggleButton({}: CardProps) {
  return (
    <AgentSettingsToggler>
      <AgentSettings />
    </AgentSettingsToggler>
  );
}

export default AgentSettingsToggleButton;
