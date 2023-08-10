import * as React from "react";
import { Box, Card, Link, Tooltip } from "@mui/joy";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";

type Props = {
  children: React.ReactNode;
  open: boolean;
  setOpen: (isOpen: boolean) => void;
};
export default function BasicModal({ children, open, setOpen }: Props) {
  return (
    <>
      <Tooltip
        title="View some example goals for inspiration"
        variant="soft"
        color="neutral"
      >
        <Link
          variant="outlined"
          level="body-sm"
          color="neutral"
          onClick={() => setOpen(true)}
        >
          🤔 Examples
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
            maxHeight: "90%",
            p: 3,
            m: { xs: 2, sm: 2 },
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
          <Box
            sx={{
              overflow: "auto",
            }}
          >
            {children}
          </Box>
        </Card>
      </Modal>
    </>
  );
}
