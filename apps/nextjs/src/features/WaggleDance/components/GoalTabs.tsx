// features/WaggleDance/components/GoalTabs.tsx

import { useCallback, useMemo } from "react";
import { default as NextLink } from "next/link";
import { useRouter } from "next/router";
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
import { type BoxProps } from "@mui/joy/Box";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useGoalStore, {
  draftGoalPrefix,
  type GoalPlusExe,
} from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

interface GoalTabProps extends BoxProps {
  tab: GoalPlusExe;
  index: number;
}

interface GoalTabsProps {
  children: React.ReactNode;
}

// A single goal tab inside the main tabber
const GoalTab: React.FC<GoalTabProps> = ({ tab, index, key }) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const { goalList, getGoalInputValue, deleteGoal, selectedGoal } =
    useGoalStore();
  const del = api.goal.delete.useMutation();

  // Function to handle closing a tab
  const closeHandler = useCallback(
    async (tab: Goal) => {
      setIsRunning(false);
      if (!tab.id.startsWith(draftGoalPrefix)) {
        // real delete on backend
        try {
          await del.mutateAsync(tab.id);
        } catch {
          // an ignorable data corruption
        }
      }
      deleteGoal(tab.id);
    },
    [del, deleteGoal, setIsRunning],
  );

  // Render a single goal tab
  return (
    <Box
      component={NextLink}
      key={key}
      sx={{
        flex: "1 1 auto",
        maxWidth: `${100 / goalList.length}%`,
        minWidth: 0,
      }}
      href={routes.goal(tab.id, tab.executions[0]?.id)}
    >
      <Tab
        value={index}
        component={Stack}
        color={"neutral"}
        variant="plain"
        orientation="horizontal"
      >
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void closeHandler(tab);
          }}
          variant="plain"
          className="flex-end float-start"
          size="sm"
          sx={{
            minWidth: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            minHeight: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            maxWidth: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            maxHeight: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
          }}
        >
          <Close />
        </IconButton>
        <Typography
          level={selectedGoal?.id === tab.id ? "title-sm" : "body-sm"}
          noWrap
          className="m-1 flex-grow p-1"
          sx={{
            textOverflow: "ellipsis",
            textAlign: "center",
          }}
        >
          {selectedGoal?.id === tab.id ? (
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
  const router = useRouter();
  const { goalList, newGoal, selectedGoal, selectGoal } = useGoalStore();
  const { isRunning } = useWaggleDanceMachineStore();

  // Handle tab change
  const handleChange = useCallback(
    (event: React.SyntheticEvent | null, newValue: number) => {
      // prevent + from being selected
      if (newValue === goalList.length) {
        event?.preventDefault();
        return;
      }
      const goalId = goalList[newValue]?.id;
      goalId && selectGoal(goalId);
    },
    [goalList, selectGoal],
  );

  const currentTabIndex = useMemo(() => {
    return goalList.findIndex((goal) => goal.id === selectedGoal?.id);
  }, [goalList, selectedGoal?.id]);

  // Render the goal tabber
  return (
    <Tabs
      aria-label="Goal tabs"
      value={currentTabIndex}
      onChange={(event, newValue) => {
        handleChange(event, newValue as number);
      }}
      variant="soft"
      sx={{
        borderRadius: "lg",
        marginTop: -2,
        marginLeft: -2,
        marginRight: -2,
        zIndex: 100,
      }}
    >
      <TabList
        sticky="top"
        variant="outlined"
        sx={(theme) => ({
          "--main-paddingTop": `calc(${theme.spacing(
            2,
          )} + var(--Header-height, 0px))`,
          pointerEvents: isRunning ? "none" : "auto",
          borderRadius: "lg",
          display: "flex flex-shrink",
          flexWrap: "nowrap",
          top: "1",
          zIndex: 10,
          width: "100%",
          overflow: "auto hidden",
          alignSelf: "flex-start",
          scrollSnapType: "inline",
          // backgroundColor: theme.palette.background.level1,
        })}
      >
        {goalList.map((tab, index) => (
          <GoalTab key={tab.id} tab={tab} index={index} />
        ))}
        <IconButton
          className="flex-end float-start"
          color="neutral"
          size="md"
          variant="plain"
          onClick={() => {
            const newId = newGoal();
            void router.replace(routes.goal(newId), undefined, {
              shallow: true,
            });
          }}
        >
          <Add />
        </IconButton>
      </TabList>
      <Box className="mx-6 mt-1">{children}</Box>
    </Tabs>
  );
};

export default GoalTabs;
