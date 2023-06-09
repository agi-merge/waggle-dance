import { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Add, Close } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  Tab,
  TabList,
  Tabs,
  Typography,
  type TabsProps,
} from "@mui/joy";
import { v4 } from "uuid";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export type HistoryTab = Goal & {
  index: number;
  tooltip?: string;
  selectedByDefault?: boolean;
};

interface HistoryTabProps {
  tab: HistoryTab;
  currentTabIndex: number;
  count: number;
  onSelect: (tab: HistoryTab) => void;
}

interface HistoryTabberProps extends TabsProps {
  children: React.ReactNode;
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  tab,
  currentTabIndex,
  count,
  onSelect,
}) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const { goalMap, setGoalMap, goalInputValue } = useGoalStore();
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
      await del.mutateAsync(tab.id); // const tabs = Object.values(historyData).filter((t) => t.id !== tab.id);
    } else {
      delete goalMap[tab.id];
      setGoalMap({ ...goalMap });
    }
    const goals = (await refetch()).data;

    if (goals?.length ?? 0 === 0) {
      const id = `tempgoal-${v4}`;
      goalMap[id] = {
        id,
        prompt: "",
        index: 0,
        selectedByDefault: true,
        tooltip: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "",
      };
      setGoalMap({ ...goalMap });
      return;
    }
    for (const goal of goals ?? []) {
    }
    (goals?.length ?? 0) === 0 &&
      router.pathname !== "/" &&
      (await router.push("/"));
  };

  return (
    <Tab
      sx={{
        width: `${100 / count - 13}%`,
      }}
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
      variant="outlined"
    >
      <IconButton
        size="sm"
        color="neutral"
        variant="plain"
        onClick={() => {
          void closeHandler(tab);
        }}
      >
        <Close />
      </IconButton>
      <Button
        className="m-0 flex w-full overflow-clip p-0"
        size="sm"
        color="neutral"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore:next-line
        // FIXME: relies on undefined behavior to get desired style (weirdly not available otherwise)
        variant=""
        onClick={() => {
          onSelect(tab);
        }}
      >
        <Typography
          fontStyle={goalInputValue.length > 0 ? "normal" : "italic"}
          level="body3"
          noWrap
          className="flex-grow"
        >
          {tab.id.startsWith("tempgoal-") ? (
            <>{goalInputValue.length > 0 ? goalInputValue : "New Goal"}</>
          ) : tab.prompt.length < 120 ? (
            tab.prompt
          ) : (
            `${tab.prompt.slice(0, 120)}…`
          )}
        </Typography>
      </Button>
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ children }) => {
  const { goalMap, setGoalMap, currentTabIndex, setCurrentTabIndex } =
    useGoalStore();
  const goals = useMemo(() => Object.values(goalMap), [goalMap]);
  // Set the default tab if it exists on first component mount
  useEffect(() => {
    const defaultTab = Object.values(goalMap).find(
      (tab) => tab.selectedByDefault === true,
    );

    if (defaultTab) {
      setCurrentTabIndex(defaultTab.index);
    }
  }, [goalMap, setCurrentTabIndex]);

  // Handle tab change
  const handleChange = (
    event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    if (newValue === goals.length) {
      event?.preventDefault();
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);
  };

  // 🌍 Render
  return (
    <>
      {goals.length > 0 && (
        <Tabs
          aria-label="Goal tabs"
          value={currentTabIndex}
          onChange={(event, newValue) =>
            handleChange(event, newValue as number)
          }
          sx={{
            borderRadius: "sm",
            background: "transparent",
            marginTop: -2.5,
            marginX: -3,
          }}
        >
          {goals.filter((t) => t.prompt.length > 0).length > 0}
          <TabList sx={{ background: "transparent" }}>
            {goals.map((tab) => (
              <HistoryTab
                key={tab.id}
                onSelect={() => {
                  setCurrentTabIndex(tab.index);
                }}
                count={goals.length}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            {goals.length > 0 && (
              <Box className="mt-1 justify-center px-2 align-middle">
                <IconButton
                  color="neutral"
                  variant="plain"
                  onClick={() => {
                    // setGoal("");
                    // const tabs = historyData.tabs;
                    // const index = tabs.length;
                    // setHistoryData({
                    //   tabs: [
                    //     ...tabs,
                    //     ...[
                    //       {
                    //         id: `tempgoal-${v4()}`,
                    //         label: "",
                    //         index,
                    //       } as HistoryTab,
                    //     ],
                    //   ],
                    // });
                    // setCurrentTabIndex(index);

                    const id = `tempgoal-${v4}`;
                    const index = goals.length;
                    goalMap[id] = {
                      id,
                      prompt: "",
                      index,
                      selectedByDefault: true,
                      tooltip: "",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userId: "",
                    };

                    setGoalMap({ ...goalMap });
                    setCurrentTabIndex(index);
                  }}
                >
                  <Add />
                </IconButton>
              </Box>
            )}
          </TabList>
          <Box className="mx-6 mt-1">{children}</Box>
        </Tabs>
      )}
    </>
  );
};

export default HistoryTabber;
