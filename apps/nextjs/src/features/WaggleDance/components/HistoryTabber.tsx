import { useEffect } from "react";
import { useRouter } from "next/router";
import { Add, Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Tab,
  TabList,
  Tabs,
  Typography,
  type TabsProps,
} from "@mui/joy";
import { v4 } from "uuid";

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
}

interface HistoryTabberProps extends TabsProps {
  tabs: HistoryTab[];
  children: React.ReactNode;
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  tab,
  count,
  currentTabIndex,
  onSelect,
}) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const { historyData, setHistoryData } = useHistory();
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
    if (historyData.tabs.length <= 1) {
      return;
    }
    if (!tab.id.startsWith("tempgoal-")) {
      // skip stubbed new tabs
      await del.mutateAsync(tab.id);
    }
    const tabs = historyData.tabs.filter((t) => t.id !== tab.id);
    setHistoryData({ tabs });
    const goals = (await refetch()).data;
    (goals?.length ?? 0) === 0 &&
      router.pathname !== "/" &&
      (await router.push("/"));
  };

  return (
    <Tab
      sx={{
        width: `${100 / count - 13}%`,
      }}
      color="neutral"
      variant="outlined"
    >
      <IconButton
        color="neutral"
        variant="plain"
        onClick={() => {
          void closeHandler(tab);
        }}
      >
        <Close />
      </IconButton>
      <Button
        className="m-0 w-full items-start justify-start overflow-clip p-0"
        size="sm"
        color="neutral"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore:next-line
        // FIXME: relies on undefined behavior to get desired style (weirdly not available otherwise)
        variant=""
        onClick={() => {
          onSelect && onSelect(tab);
        }}
      >
        <Typography level="body3" noWrap className="w-full">
          {tab.label.length < 120 ? tab.label : `${tab.label.slice(0, 120)}…`}
        </Typography>
      </Button>
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ tabs, children }) => {
  const { setGoal } = useGoal();
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
          sx={{ borderRadius: "sm", background: "transparent" }}
          className="m-0 p-0"
        >
          <TabList sx={{ background: "transparent" }}>
            {tabs.map((tab) => (
              <>
                <HistoryTab
                  onSelect={() => {
                    setCurrentTabIndex(tab.index);
                    setGoal(tab.label);
                  }}
                  count={tabs.length}
                  tab={tab}
                  currentTabIndex={currentTabIndex}
                />
                {tab.index !== tabs.length && (
                  <Divider orientation="vertical" />
                )}
              </>
            ))}
            {tabs.length > 0 && (
              <IconButton
                className="w-14"
                size="md"
                color="neutral"
                variant="plain"
                onClick={() => {
                  setGoal("");
                  const tabs = historyData.tabs;
                  const index = tabs.length;
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
                  setCurrentTabIndex(index);
                }}
              >
                <Add />
              </IconButton>
            )}
          </TabList>
          <Box className="mx-2 mt-2 p-0">{children}</Box>
        </Tabs>
      )}
    </Box>
  );
};

export default HistoryTabber;
