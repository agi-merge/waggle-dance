import * as React from "react";
import { Card, Typography } from "@mui/joy";
import Box from "@mui/joy/Box";
import Link from "@mui/joy/Link";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import Tooltip from "@mui/joy/Tooltip";

type Props = {
  children: React.ReactNode;
  open: boolean;
  setOpen: (isOpen: boolean) => void;
};
export default function TemplatesModal({ children, open, setOpen }: Props) {
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
          fontSize={{ xs: "xs", sm: "sm" }}
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
          }}
        >
          <Typography color="neutral" level="title-lg" className="px-5">
            Examples
          </Typography>
          <Typography level="body-md" className="px-5 pb-2">
            For better results, try to{" "}
            <Link
              href="https://platform.openai.com/docs/guides/gpt-best-practices"
              target="_blank"
              rel="noopener noreferrer"
            >
              follow GPT best practices
            </Link>
          </Typography>
          <ModalClose
            variant="outlined"
            sx={{
              top: "calc(-1/4 * var(--IconButton-size))",
              right: "calc(-1/4 * var(--IconButton-size))",
              boxShadow: "0 2px 12px 0 rgba(0 0 0 / 0.2)",
              borderRadius: "50%",
              bgcolor: "background.body",
              overflow: "auto",
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
