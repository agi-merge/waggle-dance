import { useEffect } from "react";
import { useRouter } from "next/router";
import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
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
      key={tab.id}
      className={`text-overflow-ellipsis m-0 flex flex-grow items-start overflow-hidden p-0`}
      sx={{
        width: `${100 / count - 7}%`,
        background: "transparent",
      }}
      color={"neutral"}
      variant="plain"
    >
      <Button
        startDecorator={
          <IconButton
            color="danger"
            variant="plain"
            onClick={() => {
              void closeHandler(tab);
            }}
          >
            <Close />
          </IconButton>
        }
        className="m-0 w-full overflow-clip p-0"
        size="sm"
        color={currentTabIndex === tab.index ? "primary" : "neutral"}
        variant="outlined"
        onClick={() => {
          onSelect && onSelect(tab);
        }}
      >
        <Typography noWrap className="w-full">
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
          sx={{ borderRadius: "sm" }}
          className="-mx-4 -mt-4"
          variant="plain"
        >
          <TabList className="m-0 p-0">
            {tabs.map((tab) => (
              <>
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
                <Divider orientation="vertical" />
              </>
            ))}
            {tabs.length > 0 && (
              <Stack
                spacing={1}
                direction="row"
                alignItems="center"
                useFlexGap
                className="m-2 flex flex-grow items-end overflow-hidden p-0"
              >
                <Button
                  className="m-0 overflow-clip p-0"
                  size="sm"
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
                  <Typography className="p-2" noWrap>
                    +
                  </Typography>
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
