import { useCallback, useMemo } from "react";
import { Add, Close } from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from "@mui/joy";

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
}

interface GoalTabsProps {
  children: React.ReactNode;
}

// A single goal tab inside the main tabber
const GoalTab: React.FC<GoalTabProps> = ({ tab, currentTabIndex }) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const { goalMap, getGoalInputValue, deleteGoal, setCurrentTabIndex } =
    useGoalStore();
  const del = api.goal.delete.useMutation();

  // Function to handle closing a tab
  const closeHandler = useCallback(
    async (tab: GoalTab) => {
      setIsRunning(false);
      if (!tab.id.startsWith("tempgoal-")) {
        // real delete on backend
        try {
          await del.mutateAsync(tab.id);
        } catch {
          // an ignorable data corruption
        }
      }
      deleteGoal(tab);
    },
    [del, deleteGoal, setIsRunning],
  );

  // Render a single goal tab
  return (
    <Box
      sx={{
        flex: "1 1 auto",
        maxWidth: `${100 / goalMap.size}%`,
        minWidth: 0,
      }}
    >
      <Tab
        component={Stack}
        color={currentTabIndex === tab.index ? "primary" : "neutral"}
        sx={{
          marginX: 0.5,
        }}
        gap="0.5rem"
        orientation="horizontal"
        variant="outlined"
        className="flex flex-grow"
        onClick={() => {
          setCurrentTabIndex(tab.index);
        }}
      >
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
        <Typography
          fontStyle={
            currentTabIndex === tab.index && getGoalInputValue().length > 0
              ? "normal"
              : "italic"
          }
          level="body3"
          noWrap
          className="flex-grow"
          textColor="common.white"
          sx={{
            mixBlendMode: "difference",
            textOverflow: "ellipsis",
            textAlign: "center",
          }}
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
      </Tab>
      <Divider orientation="vertical" />
    </Box>
  );
};

// The main goal tabber component
const GoalTabs: React.FC<GoalTabsProps> = ({ children }) => {
  const { goalMap, newGoal, currentTabIndex, setCurrentTabIndex } =
    useGoalStore();
  const entries = useMemo(
    () =>
      goalMap && goalMap.entries
        ? Array.from(goalMap.entries()).sort((a, b) => a[1].index - b[1].index)
        : [],
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
            marginLeft: -3,
            marginRight: -2.5,
          }}
          orientation="horizontal"
        >
          <TabList
            sx={{
              background: "transparent",
              display: "flex flex-shrink",
              flexWrap: "nowrap",
            }}
          >
            {entries.map(([key, tab], _index) => (
              <GoalTab key={key} tab={tab} currentTabIndex={currentTabIndex} />
            ))}
            <IconButton
              className="flex-end float-start"
              color="neutral"
              size="md"
              variant="plain"
              onClick={() => {
                newGoal();
              }}
            >
              <Add />
            </IconButton>
          </TabList>
          <Box className="mx-6 mt-1">{children}</Box>
        </Tabs>
      )}
    </>
  );
};

export default GoalTabs;
