import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Link from "@mui/joy/Link";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import Tooltip from "@mui/joy/Tooltip";
import * as React from "react";

type Props = {
  children: React.ReactNode;
};
export default function BasicModal({ children }: Props) {
  const [open, setOpen] = React.useState<boolean>(false);
  return (
    <React.Fragment>
      <Box className="flex justify-center">
        <Tooltip
          title="Add relevant documents and data"
          variant="soft"
          color="neutral"
        >
          <Link
            color="primary"
            level="body-sm"
            className="flex-shrink"
            onClick={() => setOpen(true)}
          >
            💰 Data + Tools
          </Link>
        </Tooltip>
      </Box>
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
    </React.Fragment>
  );
}
