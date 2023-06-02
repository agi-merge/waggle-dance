// GoalSettings.tsx

import React from "react";
import { Card, FormHelperText, FormLabel, Link } from "@mui/joy";
import Box from "@mui/joy/Box";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Switch from "@mui/joy/Switch";
import Typography from "@mui/joy/Typography";

import DocsModal from "~/features/WaggleDance/components/DocsModal";
import AddDocuments from "~/pages/add-documents";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

function AdvancedSettingsToggle({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Stack direction={{ xs: "column" }} gap="0.25rem">
      <Box>
        <Link className="m-0 mt-0 p-0" onClick={toggleSettings}>
          <Typography level="body4" color="primary" className="m-0 p-0">
            Advanced Settings {isOpen ? "▲" : "▼"}
          </Typography>
        </Link>
      </Box>
      {isOpen && (
        <DocsModal>
          <AddDocuments hideTitleGoal={true} />
        </DocsModal>
      )}
      {isOpen && <Box>{children}</Box>}
    </Stack>
  );
}

function GoalSettings() {
  const {
    isAutoStartEnabled,
    setIsAutoStartEnabled,
    executionMethod,
    setExecutionMethod,
    temperatureOption,
    setTemperatureOption,
    llmOption,
    setLLMOption,
  } = useWaggleDanceMachineStore();

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsAutoStartEnabled(event.target.checked);
  };

  return (
    <Card variant="outlined" size="sm">
      <Stack direction={{ xs: "column", md: "column" }} gap="0rem">
        <Stack direction="row" gap="0.25rem">
          <Box>
            <FormLabel>
              <Typography level="body2">Auto start</Typography>
            </FormLabel>
            <FormHelperText sx={{ mt: 0 }}>
              <Typography
                level="body4"
                className="h-8 w-48 items-center justify-center"
              >
                {isAutoStartEnabled
                  ? 'Planning begins immediately after pressing "Next"'
                  : "Connect data and tools before starting"}
              </Typography>
            </FormHelperText>
          </Box>
          <Switch
            checked={isAutoStartEnabled}
            onChange={handleSwitchChange}
            variant="soft"
            slotProps={{
              endDecorator: {
                sx: {
                  minWidth: 24,
                },
              },
            }}
          />
        </Stack>
        <AdvancedSettingsToggle>
          <Stack direction={{ xs: "column", md: "row" }} gap="0.5rem">
            <Box>
              <Typography level="body3">Execution Method</Typography>
              <Select
                value={executionMethod}
                onChange={(_, value) => {
                  value && setExecutionMethod(value);
                }}
              >
                <Option value="ConversationalReAct">
                  Faster, less accurate
                </Option>
                <Option value="CoT">Slower, more accurate</Option>
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
                <Option value="gpt-3.5-turbo-0314">gpt-3.5-turbo-0314</Option>
                <Option value="gpt-4-0314">gpt-4-0314</Option>
              </Select>
            </Box>
          </Stack>
        </AdvancedSettingsToggle>
      </Stack>
    </Card>
  );
}

export default GoalSettings;
