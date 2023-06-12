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
  const { goalMap, setGoalMap, goalInputValue, setCurrentTabIndex } =
    useGoalStore();
  const goalCount = useMemo(() => Object.keys(goalMap).length, [goalMap]);
  const router = useRouter();
  const del = api.goal.delete.useMutation();
  const { refetch } = api.goal.topByUser.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log("api.goal.topByUser", data);
    },
  });
  const closeHandler = async (tab: HistoryTab) => {
    setIsRunning(false);
    if (!tab.id.startsWith("tempgoal-")) {
      // skip stubbed new tabs
      await del.mutateAsync(tab.id); // const tabs = Object.values(historyData).filter((t) => t.id !== tab.id);
    } else {
      const newGoalMap = new Map(goalMap);

      newGoalMap.delete(tab.id);
      setGoalMap(newGoalMap);
      if (goalCount <= 1) {
        return;
      }
    }
    const goals = (await refetch()).data;

    if (goals?.length ?? 0 === 0) {
      const id = tab.id;
      const newGoalMap = new Map<string, HistoryTab>();
      // id literal gets inserted
      newGoalMap.set(id, {
        id,
        prompt: "",
        index: 0,
        tooltip: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "",
      });

      setGoalMap(newGoalMap);
      setCurrentTabIndex(0);
      return;
    }
    let index = 0;
    for (const goal of goals ?? []) {
      goalMap.set(goal.id, {
        ...goal,
        index,
      });
      index += 1;
    }
    (goals?.length ?? 0) === 0 &&
      router.pathname !== "/" &&
      (await router.push("/"));
  };

  return (
    <Tab
      sx={{
        width: `${100 / (count + 1)}%`,
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
          textColor="common.white"
          sx={{ mixBlendMode: "difference" }}
        >
          {currentTabIndex === tab.index ? (
            <>{goalInputValue.length > 0 ? goalInputValue : "New Goal"}</>
          ) : tab.prompt.length < 120 ? (
            tab.prompt.length > 0 ? (
              tab.prompt
            ) : (
              "New Goal"
            )
          ) : (
            `${tab.prompt.slice(0, 120)}…`
          )}
        </Typography>
      </Button>
      <Typography level="body5">
        {tab.index} | {tab.id.slice(tab.id.length - 4)}
      </Typography>
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ children }) => {
  const {
    goalMap,
    setGoalMap,
    currentTabIndex,
    setCurrentTabIndex,
    goalInputValue,
  } = useGoalStore();
  const entries = useMemo(
    () => (goalMap && goalMap.entries ? Array.from(goalMap.entries()) : []),
    [goalMap],
  );

  // Handle tab change
  const handleChange = (
    event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    // prevent + from being selected
    if (newValue === goalMap.size) {
      event?.preventDefault();
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);
  };

  // 🌍 Render
  return (
    <>
      {entries.length > 0 && (
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
          <TabList sx={{ background: "transparent" }}>
            {entries.map(([_key, tab], index) => (
              <HistoryTab
                key={tab.id}
                onSelect={() => {
                  // save currentSelectedTab's prompt
                  const goal = goalMap.get(tab.id);
                  const newGoalMap = new Map(goalMap);
                  newGoalMap.set(tab.id, {
                    id: tab.id ?? goal?.id,
                    prompt: goalInputValue ?? goal?.prompt,
                    index: index,
                    userId: goal?.userId ?? "",
                    tooltip: goal?.tooltip,
                    createdAt: goal?.createdAt ?? new Date(),
                    updatedAt: new Date(),
                  });
                  setGoalMap(newGoalMap);
                  setCurrentTabIndex(index);
                }}
                count={entries.length}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            {entries.length > 0 && (
              <Box className="mt-1 justify-center px-2 align-middle">
                <IconButton
                  color="neutral"
                  variant="plain"
                  onClick={() => {
                    const id = `tempgoal-${v4()}`;
                    const index = entries.length;
                    const newGoalMap = new Map(goalMap);
                    newGoalMap.set(id, {
                      id,
                      prompt: "",
                      index,
                      tooltip: "",
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      userId: "",
                    });

                    setGoalMap(newGoalMap);
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
