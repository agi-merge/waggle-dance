import React from "react";
import { Box, Divider, Stack, type CardProps } from "@mui/joy";

import AddDocuments from "~/features/AddDocuments/AddDocuments";
import DocsModal from "~/features/AddDocuments/components/DocsModal";
import SkillsModal from "~/features/Skills/components/SkillsModal";
import SkillSelect from "~/features/Skills/SkillSelect";
import AgentSettings from "../AgentSettings";

function AgentSettingsToggler({}: { children: React.ReactNode }) {
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
