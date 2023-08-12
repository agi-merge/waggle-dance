// GoalSettings.tsx

import React, { type SyntheticEvent } from "react";
import { ClickAwayListener } from "@mui/base";
import { InfoOutlined } from "@mui/icons-material";
import {
  Alert,
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

import routes from "~/utils/routes";
import DocsModal from "~/features/WaggleDance/components/DocsModal";
import AddDocuments from "~/pages/add-documents";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import {
  AgentPromptingMethod,
  LLM,
  Temperature,
} from "../../../../../../packages/agent/src/utils/llms";

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
      <>
        <Link
          className="m-0 mt-0 p-0"
          onClick={(event) => {
            event.preventDefault();
            setAnchorEl(event.currentTarget);
            setIsOpen(!isOpen);
          }}
          aria-haspopup="menu"
          id="agent-settings-button"
          aria-controls={"agent-settings-menu"}
          aria-expanded={isOpen}
        >
          <Typography level="body-sm" className="m-0 p-0">
            {isOpen ? "▼" : "▲"} Agent Settings
          </Typography>
        </Link>
        {isOpen && (
          <ClickAwayListener onClickAway={handleClose}>
            <Menu
              autoFocus
              aria-labelledby="agent-settings-button"
              id="agent-settings-menu"
              anchorEl={anchorEl}
              open={isOpen}
              onClose={handleClose}
              placement="top-start"
              className="w-64"
            >
              {children}
            </Menu>
          </ClickAwayListener>
        )}
      </>
    </Stack>
  );
}
function GoalSettings({}: CardProps) {
  const { agentSettings, setAgentSettings, isRunning } =
    useWaggleDanceMachineStore();
  const [isShowingAlert, setIsShowingAlert] = React.useState(false);
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
        defaultValue={0}
        value={currentTabIndex}
        onChange={handleChange}
        aria-label="Settings for plan, execute, and review agents"
      >
        <TabList>
          {types.map((type, i) => (
            <Tab key={type} value={i} sx={{ flex: "1 1 auto" }}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Tab>
          ))}
        </TabList>
        {types.map((type, i) => (
          <TabPanel key={type} value={i}>
            <Typography level="title-md">
              Model for {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
            <Select
              value={agentSettings[type].modelName}
              onChange={(_, value) => {
                setIsShowingAlert(true);
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
            <Typography level="body-md">
              Temperature for {type.charAt(0).toUpperCase() + type.slice(1)}
            </Typography>
            <Select
              value={agentSettings[type].temperature}
              onChange={(_, value) => {
                setIsShowingAlert(true);
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
            {type !== "plan" && (
              <>
                <Typography level="body-md">
                  Prompting Method for{" "}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>

                <Select
                  value={agentSettings[type].agentPromptingMethod}
                  onChange={(_, value) => {
                    setIsShowingAlert(true);
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
              </>
            )}
          </TabPanel>
        ))}
      </Tabs>
      {!session && (
        <Typography level="body-md" sx={{ p: 1, textAlign: "center" }}>
          <Link href={routes.auth}>Log in to change settings</Link>
        </Typography>
      )}
      {isRunning && isShowingAlert && (
        <Alert
          size="md"
          startDecorator={<InfoOutlined sx={{ margin: 1 }} />}
          sx={{ padding: 0.5 }}
        >
          <Typography level="body-xs" sx={{ p: 1, textAlign: "center" }}>
            Settings apply to all future Tasks, but not any current Tasks.
          </Typography>
        </Alert>
      )}
    </AdvancedSettingsToggle>
  );
}

export default GoalSettings;
