import * as React from "react";
import { KeyboardArrowUp } from "@mui/icons-material";
import { Stack, Typography } from "@mui/joy";
import Button from "@mui/joy/Button";
import Menu from "@mui/joy/Menu";
import MenuItem from "@mui/joy/MenuItem";

import type DAG from "../DAG";

type Props = {
  dag: DAG;
};

export default function SelectedMenu({ dag }: Props) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [_selectedIndex, setSelectedIndex] = React.useState<number>(1);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // if (event.currentTarget === anchorEl) {
    //   setAnchorEl(null);
    // } else {
    setAnchorEl(event.currentTarget);
    // }
  };
  const createHandleClose = (index: number) => () => {
    setAnchorEl(null);
    if (typeof index === "number") {
      setSelectedIndex(index);
    }
  };

  return (
    <Stack gap="0.5rem" className="mr-3">
      <Button
        id="selected-demo-button"
        aria-controls={open ? "selected-demo-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        variant="soft"
        size="sm"
        color="neutral"
        onClick={handleClick}
        startDecorator={<KeyboardArrowUp />}
      >
        <Typography>AI</Typography>
      </Button>
      <Menu
        id="selected-demo-menu"
        anchorEl={anchorEl}
        open={open}
        size="sm"
        onClose={createHandleClose(-1)}
        aria-labelledby="selected-demo-button"
      >
        {dag.nodes.map((n) => (
          <MenuItem key={n.id}>{n.id}</MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
