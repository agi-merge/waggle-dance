import { useCallback, useEffect } from "react";
import NextLink from "next/link";
import router, { useRouter } from "next/router";
import { Add, Close, Cloud } from "@mui/icons-material";
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/joy";
import { useSession } from "next-auth/react";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

interface GoalTabProps {
  tab: Goal;
  index: number;
}

interface GoalTabsProps {
  children: React.ReactNode;
}

// A single goal tab inside the main tabber
const GoalTab: React.FC<GoalTabProps> = ({ tab, index }) => {
  const { data: sessionData } = useSession();
  const { setIsRunning } = useWaggleDanceMachineStore();
  const { goalList, getGoalInputValue, deleteGoal, getSelectedGoal } =
    useGoalStore();
  const del = api.goal.delete.useMutation();

  // Function to handle closing a tab
  const closeHandler = useCallback(
    async (tab: Goal) => {
      setIsRunning(false);
      if (!tab.id.startsWith("tempgoal-")) {
        // real delete on backend
        try {
          await del.mutateAsync(tab.id);
        } catch {
          // an ignorable data corruption
        }
      }
      const result = deleteGoal(tab);
      if (result) {
        const { prevId, goalList } = result;
        if (goalList && goalList[0]) {
          void router.push(`/goal/${goalList[0].id}`);
        } else {
          prevId
            ? void router.replace(`/goal/${prevId}`)
            : void router.push("/");
        }
      }
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
        tabIndex={index}
        component={Stack}
        color={getSelectedGoal()?.id === tab.id ? "primary" : "neutral"}
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
            getSelectedGoal()?.id === tab.id && getGoalInputValue().length > 0
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
          {getSelectedGoal()?.id === tab.id ? (
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

        {tab.id.startsWith("tempgoal-") && tab.prompt.trim() !== "" ? (
          <Tooltip title="Temporary, will be deleted upon page reload">
            <Chip size="sm" color="warning" variant="outlined">
              {sessionData?.user.id ? (
                <Typography level="body5">Not saved</Typography>
              ) : (
                <NextLink href="/api/auth/signin">
                  <Typography level="body5">Sign in</Typography>
                </NextLink>
              )}
            </Chip>
          </Tooltip>
        ) : tab.userId.trim() !== "" ? (
          <Tooltip title="Saved to your account">
            <Chip size="sm" color="neutral" variant="outlined">
              <Cloud />
            </Chip>
          </Tooltip>
        ) : (
          <></>
        )}
      </Tab>
      <Divider orientation="vertical" />
    </Box>
  );
};

// The main goal tabber component
const GoalTabs: React.FC<GoalTabsProps> = ({ children }) => {
  const router = useRouter();
  const { goalList, newGoal, currentTabIndex, selectTab } = useGoalStore();
  const { isRunning } = useWaggleDanceMachineStore();

  useEffect(() => {
    const ids = goalList.map((g) => g.id);
    ids.forEach((id) => void router.prefetch(`/goal/${id}`));
  }, [goalList, router]);

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
      const currentGoal = goalList[newValue];
      currentGoal && void router.replace(`/goal/${currentGoal.id}`);
    },
    [goalList, router, selectTab],
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
              pointerEvents: isRunning ? "none" : "auto",
              opacity: isRunning ? 0.33 : 1,
              background: "transparent",
              display: "flex flex-shrink",
              flexWrap: "nowrap",
            }}
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
