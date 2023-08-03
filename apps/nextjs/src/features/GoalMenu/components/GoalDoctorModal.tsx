import * as React from "react";
import { Card, Link, Tooltip } from "@mui/joy";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";

type Props = {
  children: React.ReactNode;
};
export default function BasicModal({ children }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  return (
    <>
      <Tooltip title="Coming soon" variant="soft" color="neutral">
        <Link
          variant="plain"
          level="body-sm"
          className="flex-shrink"
          onClick={() => setOpen(true)}
        >
          🌺 Refine Goal
        </Link>
      </Tooltip>
      <Modal
        aria-labelledby="modal-title"
        aria-describedby="modal-desc"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card
          sx={{
            maxWidth: "md",
            p: 3,
            boxShadow: "lg",
          }}
        >
          <ModalClose
            variant="outlined"
            sx={{
              top: "calc(-1/4 * var(--IconButton-size))",
              right: "calc(-1/4 * var(--IconButton-size))",
              boxShadow: "0 2px 12px 0 rgba(0 0 0 / 0.2)",
              borderRadius: "50%",
              bgcolor: "background.body",
            }}
          />
          {children}
        </Card>
      </Modal>
    </>
  );
}
