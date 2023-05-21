import * as React from "react";
import { Card, Link } from "@mui/joy";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";

type Props = {
  children: React.ReactNode;
};
export default function BasicModal({ children }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  return (
    <React.Fragment>
      <Link
        variant="plain"
        color="neutral"
        level="body3"
        className="flex-shrink"
        onClick={() => setOpen(true)}
      >
        🤔 Browse Templates
      </Link>
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
    </React.Fragment>
  );
}
