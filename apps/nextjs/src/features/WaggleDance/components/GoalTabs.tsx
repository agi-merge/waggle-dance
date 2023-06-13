import { useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { Add, Close } from "@mui/icons-material";
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
} from "@mui/joy";
import { v4 } from "uuid";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export type GoalTab = Goal & {
  index: number;
  tooltip?: string;
};

interface GoalTabProps {
  tab: GoalTab;
  currentTabIndex: number;
  count: number;
}

interface GoalTabberProps {
  children: React.ReactNode;
}

// A single goal tab inside the main tabber
const GoalTab: React.FC<GoalTabProps> = ({ tab, currentTabIndex, count }) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const {
    goalMap,
    setGoalMap,
    getGoalInputValue,
    setCurrentTabIndex,
    prevSelectedGoal,
  } = useGoalStore();
  const router = useRouter();
  const del = api.goal.delete.useMutation();

  // Function to handle closing a tab
  const closeHandler = useCallback(
    async (tab: GoalTab) => {
      const newGoalMap = new Map(goalMap);
      setIsRunning(false);

      if (!tab.id.startsWith("tempgoal-")) {
        // real delete on backend
        await del.mutateAsync(tab.id);
      }

      // client-side goal delete
      newGoalMap.delete(tab.id);
      setGoalMap(newGoalMap);

      if (count <= 1) {
        // do not allow deleting the last tab
        setCurrentTabIndex(0);
        return;
      }

      const goals = Array.from(newGoalMap.values());

      // Update the index of the remaining goals
      goals.forEach((goal, index) => {
        newGoalMap.set(goal.id, {
          ...goal,
          index,
        });
      });

      setGoalMap(newGoalMap);

      // Set the current tab index to the previous one if available, otherwise set it to 0
      const prevIndex = goals.findIndex(
        (goal) => goal.id === prevSelectedGoal?.id,
      );
      setCurrentTabIndex(prevIndex !== -1 ? prevIndex : 0);

      // Navigate to the home page if there are no goals left
      if (goals.length === 0 && router.pathname !== "/") {
        await router.push("/");
      }
    },
    [
      count,
      del,
      goalMap,
      prevSelectedGoal?.id,
      router,
      setCurrentTabIndex,
      setGoalMap,
      setIsRunning,
    ],
  );

  // Render a single goal tab
  return (
    <Box sx={{ width: `${100 / goalMap.size + 1}%` }}>
      <Tab
        component={Stack}
        color={currentTabIndex === tab.index ? "primary" : "neutral"}
        sx={{
          marginX: 0.5,
        }}
        orientation="horizontal"
        variant="outlined"
        className="flex flex-grow items-center justify-center"
      >
        <Button
          className="flex-grow overflow-clip"
          size="sm"
          startDecorator={
            <IconButton
              size="sm"
              color="neutral"
              variant="soft"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void closeHandler(tab);
              }}
            >
              <Close />
            </IconButton>
          }
          variant="outlined"
          color="neutral"
          sx={{ marginY: -2, marginX: -1.5 }}
          onClick={() => {
            const newGoalMap = new Map(goalMap);
            const goal = newGoalMap.get(tab.id);
            newGoalMap.set(tab.id, {
              id: tab.id ?? goal?.id,
              prompt: goal?.prompt ?? "",
              index: tab.index,
              userId: goal?.userId ?? "",
              tooltip: goal?.tooltip ?? goal?.prompt,
              createdAt: goal?.createdAt ?? new Date(),
              updatedAt: new Date(),
            });
            setGoalMap(newGoalMap);
            setCurrentTabIndex(tab.index);
          }}
        >
          <Typography
            fontStyle={getGoalInputValue().length > 0 ? "normal" : "italic"}
            level="body3"
            noWrap
            className="flex-grow"
            textColor="common.white"
            sx={{ mixBlendMode: "difference" }}
          >
            {currentTabIndex === tab.index ? (
              <>
                {getGoalInputValue().length > 0
                  ? getGoalInputValue()
                  : "New Goal"}
              </>
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
      </Tab>
      <Divider orientation="vertical" />
    </Box>
  );
};

// The main goal tabber component
const GoalTabs: React.FC<GoalTabberProps> = ({ children }) => {
  const { goalMap, setGoalMap, currentTabIndex, setCurrentTabIndex } =
    useGoalStore();
  const entries = useMemo(
    () => (goalMap && goalMap.entries ? Array.from(goalMap.entries()) : []),
    [goalMap],
  );

  // Handle tab change
  const handleChange = useCallback(
    (event: React.SyntheticEvent | null, newValue: number) => {
      // prevent + from being selected
      if (newValue === goalMap.size) {
        event?.preventDefault();
        return;
      }
      // Update tab state
      setCurrentTabIndex(newValue);
    },
    [goalMap.size, setCurrentTabIndex],
  );

  // Render the goal tabber
  return (
    <>
      {entries.length > 0 && (
        <Tabs
          aria-label="Goal tabs"
          value={currentTabIndex}
          onChange={(event, newValue) => {
            event?.preventDefault();
            handleChange(event, newValue as number);
          }}
          sx={{
            borderRadius: "sm",
            background: "transparent",
            marginTop: -2.5,
            marginX: -2.5,
          }}
          orientation="horizontal"
        >
          <TabList
            sx={{
              background: "transparent",
            }}
            className="flex "
          >
            {entries.map(([_key, tab], _index) => (
              <GoalTab
                key={tab.id}
                count={entries.length}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            {entries.length > 0 && (
              <Box className="float-right flex justify-end align-middle">
                <IconButton
                  className="flex-end float-right"
                  color="primary"
                  size="md"
                  variant="soft"
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

export default GoalTabs;
