import { useCallback } from "react";
import router from "next/router";
import { Add, Close } from "@mui/icons-material";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

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
  const { goalList, getGoalInputValue, deleteGoal } = useGoalStore();
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
        maxWidth: `${100 / goalList.length}%`,
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

        {tab.id.startsWith("tempgoal-") && (
          <Chip size="sm" color="neutral">
            <Typography level="body5">Unsaved</Typography>
          </Chip>
        )}
      </Tab>
      <Divider orientation="vertical" />
    </Box>
  );
};

// The main goal tabber component
const GoalTabs: React.FC<GoalTabsProps> = ({ children }) => {
  const { goalList, newGoal, currentTabIndex, selectTab } = useGoalStore();
  const { data: sessionData } = useSession();

  // Handle tab change
  const handleChange = useCallback(
    (event: React.SyntheticEvent | null, newValue: number) => {
      // prevent + from being selected
      if (newValue === goalList.length) {
        event?.preventDefault();
        return;
      }
      selectTab(newValue);
      // Update tab state
      const currentGoal = goalList.sort((a, b) => a.index - b.index)[newValue];
      currentGoal && void router.replace(`/goal/${currentGoal.id}`);
    },
    [goalList, selectTab],
  );

  // Render the goal tabber
  return (
    <>
      {goalList.length > 0 && (
        <Tabs
          aria-label="Goal tabs"
          value={currentTabIndex}
          onChange={(event, newValue) => {
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
            {goalList.map((tab) => (
              <GoalTab
                key={tab.id}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            <IconButton
              className="flex-end float-start"
              color="neutral"
              size="md"
              variant="plain"
              onClick={() => {
                const newId = newGoal(sessionData?.user.id ?? "");
                void router.replace(`/goal/${newId}`);
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
