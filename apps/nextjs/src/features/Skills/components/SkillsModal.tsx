import * as React from "react";
import { KeyboardArrowRight } from "@mui/icons-material";
import { Button, Typography } from "@mui/joy";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Link from "@mui/joy/Link";
import Modal from "@mui/joy/Modal";
import ModalClose from "@mui/joy/ModalClose";
import Tooltip from "@mui/joy/Tooltip";

import Title from "~/features/MainLayout/components/PageTitle";

type Props = {
  children: React.ReactNode;
};
export default function SkillsModal({ children }: Props) {
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
            🔨 Skills
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
          <Title title="🔨 Skills"></Title>
          <Box sx={{ overflow: "scroll" }}>
            <Typography
              level="body-lg"
              sx={{
                userSelect: "none",
                marginBottom: { xs: -1, sm: 0 },
              }}
            >
              Agents can be empowered with skills. Skills reach out into the
              world, and can either create side effects such as emails being
              sent, or observe things, like by fetching data. Skills can wrap
              things like databases as well as enable intercommunication between
              agents.
            </Typography>
            {children}
          </Box>
          <Button
            className="sticky bottom-24 z-10 min-h-fit max-w-fit"
            color="primary"
            variant="soft"
            onClick={() => {
              setOpen(false);
            }}
            sx={{ position: "sticky", bottom: 0 }}
          >
            <>
              Save <KeyboardArrowRight />
            </>
          </Button>
        </Card>
      </Modal>
    </React.Fragment>
  );
}
