// GoalSettings.tsx

import React from "react";
import { Card, Divider, Link, Menu, type CardProps } from "@mui/joy";
import Box from "@mui/joy/Box";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

import DocsModal from "~/features/WaggleDance/components/DocsModal";
import AddDocuments from "~/pages/add-documents";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

function AdvancedSettingsToggle({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClose = () => {
    setAnchorEl(null);
    setIsOpen(false);
  };

  return (
    <Stack direction="row" gap="0.5rem">
      <Box className="align-start flex flex-shrink">
        <DocsModal>
          <AddDocuments hideTitleGoal={true} />\
        </DocsModal>
      </Box>
      <Divider orientation="vertical" />
      <Link
        id="basic-demo-button"
        className="m-0 mt-0 p-0"
        onClick={(event) => {
          setAnchorEl(event.currentTarget);
          setIsOpen(!isOpen);
        }}
        aria-haspopup="true"
        aria-controls={isOpen ? "basic-menu" : undefined}
        aria-expanded={isOpen ? "true" : undefined}
      >
        <Typography
          level="body4"
          sx={{ mixBlendMode: "difference" }}
          textColor="common.white"
          className="m-0 p-0"
          aria-labelledby="basic-demo-button"
        >
          {isOpen ? "▼" : "▲"} Advanced Settings
        </Typography>
      </Link>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        placement="top-start"
      >
        <Card className="min-h-fit">{children}</Card>
      </Menu>
    </Stack>
  );
}

function GoalSettings({}: CardProps) {
  const {
    executionMethod,
    setExecutionMethod,
    temperatureOption,
    setTemperatureOption,
    llmOption,
    setLLMOption,
  } = useWaggleDanceMachineStore();

  return (
    <AdvancedSettingsToggle>
      <Stack direction={{ md: "column" }} gap="0.5rem">
        <Box>
          <Typography level="body3">Execution Method</Typography>
          <Select
            value={executionMethod}
            onChange={(_, value) => {
              value && setExecutionMethod(value);
            }}
          >
            <Option value="Faster, less accurate">Faster, less accurate</Option>
            <Option value="Slower, more accurate">Slower, more accurate</Option>
          </Select>
        </Box>
        <Box>
          <Typography level="body3">Temperature</Typography>
          <Select
            value={temperatureOption}
            onChange={(_, value) => {
              value && setTemperatureOption(value);
            }}
          >
            <Option value="Stable">Stable</Option>
            <Option value="Balanced">Balanced</Option>
            <Option value="Creative">Creative</Option>
          </Select>
        </Box>
        <Box>
          <Typography level="body3">Model</Typography>
          <Select
            value={llmOption}
            onChange={(_, value) => {
              value && setLLMOption(value);
            }}
          >
            <Option value="gpt-3.5-turbo-0301">gpt-3.5-turbo-0301</Option>
            <Option value="gpt-4-0314">gpt-4-0314</Option>
          </Select>
        </Box>
      </Stack>
    </AdvancedSettingsToggle>
  );
}

export default GoalSettings;
