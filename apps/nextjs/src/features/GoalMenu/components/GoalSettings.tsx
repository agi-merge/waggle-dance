// GoalSettings.tsx

import React, { type SyntheticEvent } from "react";
import {
  Card,
  Divider,
  Link,
  Menu,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  type CardProps,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { useSession } from "next-auth/react";

import {
  AgentPromptingMethod,
  LLM,
  Temperature,
} from "@acme/chain/src/utils/llms";

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
          <AddDocuments />
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
          className="m-0 p-0"
          aria-labelledby="basic-demo-button"
        >
          {isOpen ? "▼" : "▲"} Agent Settings
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
  const { agentSettings, setAgentSettings } = useWaggleDanceMachineStore();

  const { data: session } = useSession();

  const types: Array<"plan" | "review" | "execute"> = [
    "plan",
    "review",
    "execute",
  ];

  const [currentTabIndex, setCurrentTabIndex] = React.useState(0);

  const handleChange = (
    event: SyntheticEvent<Element, Event> | null,
    newValue: number | string | null,
  ) => {
    setCurrentTabIndex(newValue as number);
  };

  return (
    <AdvancedSettingsToggle>
      <Tabs
        variant="outlined"
        defaultValue={0}
        value={currentTabIndex}
        onChange={handleChange}
        aria-label="Settings for plan, execute, and review agents"
      >
        <TabList>
          {types.map((type, i) => (
            <Tab key={type} value={i}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Tab>
          ))}
        </TabList>
        {types.map((type, i) => (
          <TabPanel key={type} value={i}>
            <Typography level="body3">
              Model for {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
            <Select
              value={agentSettings[type].modelName}
              onChange={(_, value) => {
                value && setAgentSettings(type, { modelName: value });
              }}
              disabled={!session}
            >
              {Object.values(LLM).map((model) => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
            <Typography level="body3">
              Temperature for {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
            <Select
              value={agentSettings[type].temperature}
              onChange={(_, value) => {
                value && setAgentSettings(type, { temperature: value });
              }}
              disabled={!session}
            >
              {Object.values(Temperature).map((temp) => (
                <Option key={temp} value={temp}>
                  {temp}
                </Option>
              ))}
            </Select>
            <Typography level="body3">
              Prompting Method for{" "}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
            <Select
              value={agentSettings[type].agentPromptingMethod}
              onChange={(_, value) => {
                value &&
                  setAgentSettings(type, { agentPromptingMethod: value });
              }}
              disabled={!session}
            >
              {Object.values(AgentPromptingMethod).map((method) => (
                <Option key={method} value={method}>
                  {method}
                </Option>
              ))}
            </Select>
          </TabPanel>
        ))}
      </Tabs>
      {!session && (
        <Typography level="body3" sx={{ p: 1, textAlign: "center" }}>
          <Link href="/api/auth/signin">Log in to change settings</Link>
        </Typography>
      )}
    </AdvancedSettingsToggle>
  );
}

export default GoalSettings;
