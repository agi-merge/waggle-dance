import React, { useState } from "react";
import { Button, Card, FormHelperText, FormLabel, Link, Sheet } from "@mui/joy";
import Box from "@mui/joy/Box";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Switch from "@mui/joy/Switch";
import Typography from "@mui/joy/Typography";

function AdvancedSettingsToggle({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSettings = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Stack direction={{ xs: "column" }} gap="1rem">
      <Box>
        <Link className="m-0 mt-0 p-0" onClick={toggleSettings}>
          <Typography level="body4" color="primary" className="m-0 p-0">
            Advanced Settings {isOpen ? "▲" : "▼"}
          </Typography>
        </Link>
      </Box>
      {isOpen && <Box>{children}</Box>}
    </Stack>
  );
}

function GoalSettings() {
  const [autoStart, setAutoStart] = useState(true);
  const [executionMethod, setExecutionMethod] = useState("ConversationalReAct");
  const [temperatureOption, setTemperatureOption] = useState("Stable");
  const [llmOption, setLLMOption] = useState("gpt-4-0314");

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoStart(event.target.checked);
  };

  return (
    <Stack
      direction={{ xs: "column", md: "column" }}
      gap="0rem"
      className="m-0 flex flex-grow"
    >
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
              {autoStart
                ? 'Planning begins immediately after pressing "Next"'
                : "Connect data and tools before starting"}
            </Typography>
          </FormHelperText>
        </Box>
        <Switch
          checked={autoStart}
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
              onChange={(_event, value) => {
                value && setExecutionMethod(value);
              }}
            >
              <Option value="ConversationalReAct">
                Fast - Conversational ReAct
              </Option>
              <Option value="CoT">Slow - PlanAndExecuteAgentExecutor</Option>
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
              <Option value="gpt-3.5-turbo">gpt-3.5-turbo</Option>
              <Option value="gpt-3.5-turbo-0314">gpt-3.5-turbo-0314</Option>
              <Option value="gpt-4">gpt-4</Option>
              <Option value="gpt-4-0314">gpt-4-0314</Option>
            </Select>
          </Box>
        </Stack>
      </AdvancedSettingsToggle>
    </Stack>
  );
}

export default GoalSettings;
