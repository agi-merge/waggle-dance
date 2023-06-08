import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
  type TabsProps,
} from "@mui/joy";
import { v4 } from "uuid";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import useGoal from "~/stores/goalStore";
import useHistory from "~/stores/historyStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export interface HistoryTab {
  id: string;
  index: number;
  label: string;
  tooltip?: string;
  selectedByDefault?: boolean;
}

interface HistoryTabProps {
  tab: HistoryTab;
  currentTabIndex: number;
  count: number;
  onSelect?: (tab: HistoryTab) => void; // if falsy, tab is not selectable and is treated as the plus button
  isPlusTab?: boolean;
}

interface HistoryTabberProps extends TabsProps {
  tabs: HistoryTab[];
  children: React.ReactNode;
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  tab,
  currentTabIndex,
  count,
  onSelect,
  isPlusTab,
}) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const router = useRouter();
  const del = api.goal.delete.useMutation();
  const { refetch } = api.goal.topByUser.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log("Success!", data);
    },
  });
  const closeHandler = async (tab: HistoryTab) => {
    setIsRunning(false);
    let goals: Goal[] | undefined;
    if (!tab.id.startsWith("tempgoal-")) {
      // skip stubbed new tabs
      await del.mutateAsync(tab.id);
    }
    goals = (await refetch()).data;
    (goals?.length ?? 0) === 0 &&
      router.pathname !== "/" &&
      (await router.push("/"));
  };

  return (
    <Tab
      key={tab.id}
      className={`text-overflow-ellipsis m-0 flex items-start overflow-hidden p-0`}
      sx={{
        maxWidth: `${100 / (count + 1)}%`,
        background: "transparent",
      }}
      variant="outlined"
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
      onSelect={(e) => {
        if (isPlusTab) e.preventDefault();
      }}
      onBlur={(e) => {
        if (isPlusTab) e.preventDefault();
      }}
    >
      <Stack
        spacing={1}
        direction="row"
        alignItems="center"
        useFlexGap
        className="m-0 overflow-hidden p-0"
      >
        <Button
          startDecorator={
            !isPlusTab && (
              <IconButton
                color="danger"
                variant="plain"
                onClick={() => {
                  void closeHandler(tab);
                }}
              >
                <Close />
              </IconButton>
            )
          }
          className="m-0 flex-grow overflow-clip p-0"
          size="sm"
          color="neutral"
          variant="plain"
          onClick={(e) => {
            onSelect && onSelect(tab);
            if (isPlusTab) {
              e.preventDefault();
            }
          }}
        >
          <Typography noWrap>
            {tab.label.length < 120 ? tab.label : `${tab.label.slice(0, 120)}…`}
          </Typography>
        </Button>
      </Stack>
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ tabs, children }) => {
  const { setGoal } = useGoal();
  const [plusUUID] = useState(v4());
  const { historyData, setHistoryData, currentTabIndex, setCurrentTabIndex } =
    useHistory();
  // Set the default tab if it exists on first component mount
  useEffect(() => {
    const defaultTab = tabs.find((tab) => tab.selectedByDefault === true);

    if (defaultTab) {
      setCurrentTabIndex(defaultTab.index);
    }
  }, [tabs, setCurrentTabIndex]);

  // Handle tab change
  const handleChange = (
    event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    if (newValue === tabs.length) {
      event?.preventDefault();
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);
  };

  const plusTab = () => {
    return {
      id: plusUUID,
      index: tabs.length,
      label: "+",
      tooltip: "🐝 Start wagglin' and your history will be saved!",
    } as HistoryTab;
  };

  // 🌍 Render
  return (
    <Box>
      {tabs.length > 0 && (
        <Tabs
          aria-label="Goal tabs"
          value={currentTabIndex}
          onChange={(event, newValue) =>
            handleChange(event, newValue as number)
          }
          sx={{ borderRadius: "sm" }}
          className="-mx-4 -mt-4"
          color="primary"
          variant="plain"
        >
          <TabList className="m-0 p-0">
            {tabs.map((tab) => (
              <HistoryTab
                key={tab.id}
                onSelect={() => {
                  setCurrentTabIndex(tab.index);
                  setGoal(tab.label);
                }}
                count={tabs.length}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            {tabs.length > 0 && (
              <Stack
                spacing={1}
                direction="row"
                alignItems="center"
                useFlexGap
                className="m-0 flex flex-grow items-end overflow-hidden p-0"
              >
                <Button
                  className="m-0 flex-grow overflow-clip p-0"
                  size="sm"
                  color="neutral"
                  variant="plain"
                  onClick={(e) => {
                    setGoal("");
                    const tabs = historyData.tabs;
                    const index = tabs.length - 1;
                    setHistoryData({
                      tabs: [
                        ...tabs,
                        ...[
                          {
                            id: `tempgoal-${v4()}`,
                            label: "",
                            index,
                          } as HistoryTab,
                        ],
                      ],
                    });
                  }}
                >
                  <Typography noWrap>+</Typography>
                </Button>
              </Stack>
            )}
          </TabList>
        </Tabs>
      )}

      <Box className="mx-2 mt-2 p-0">{children}</Box>
    </Box>
  );
};

export default HistoryTabber;
