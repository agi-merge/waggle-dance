// features/AgentSettings.tsx

import React, { type SyntheticEvent } from "react";
import { InfoOutlined } from "@mui/icons-material";
import Alert from "@mui/joy/Alert";
import Link from "@mui/joy/Link";
import Option from "@mui/joy/Option";
import Select from "@mui/joy/Select";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import TabPanel from "@mui/joy/TabPanel";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";
import { useSession } from "next-auth/react";

import {
  AgentPromptingMethod,
  LLM,
  Temperature,
} from "@acme/agent/src/utils/llms";

import routes from "~/utils/routes";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export function AgentSettings() {
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
    <>
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
          <Link href={routes.auth} target="_blank">
            Log in to change settings
          </Link>
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
    </>
  );
}

export default AgentSettings;
