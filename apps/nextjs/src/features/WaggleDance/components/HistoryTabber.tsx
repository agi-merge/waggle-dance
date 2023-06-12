import { useMemo } from "react";
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
  type TabProps,
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

interface HistoryTabProps extends TabProps {
  tab: HistoryTab;
  currentTabIndex: number;
  count: number;
  // onSelect: (tab: HistoryTab) => void;
}

interface HistoryTabberProps extends TabsProps {
  children: React.ReactNode;
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  tab,
  currentTabIndex,
  count,
}) => {
  const { setIsRunning } = useWaggleDanceMachineStore();
  const {
    goalMap,
    setGoalMap,
    getGoalInputValue,
    setCurrentTabIndex,
    prevSelectedGoal,
  } = useGoalStore();

  const goalInputValue = useMemo(
    () => getGoalInputValue(),
    [getGoalInputValue],
  );
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
    const newGoalMap = new Map(goalMap);
    setIsRunning(false);

    let goals: Goal[] | undefined = undefined; // tell me about it bruh
    if (!tab.id.startsWith("tempgoal-")) {
      // real delete on backend
      await del.mutateAsync(tab.id);
      goals = (await refetch()).data;
    } else {
      // client side goal delete

      newGoalMap.delete(tab.id);
      setGoalMap(newGoalMap);
      if (count <= 1) {
        // do not allow deleting the last tab
        setCurrentTabIndex(0);
        return;
      }
      goals = Array.from(newGoalMap.values());
    }

    let index = 0;
    let prevIndex = undefined;
    for (const goal of goals ?? []) {
      newGoalMap.set(goal.id, {
        ...goal,
        index,
      });
      if (goal.id === prevSelectedGoal?.id && !prevIndex) {
        prevIndex = index;
      }
      index += 1;
    }
    setGoalMap(newGoalMap);
    prevIndex ? setCurrentTabIndex(prevIndex) : setCurrentTabIndex(0);

    (goals?.length ?? 0) === 0 &&
      router.pathname !== "/" &&
      (await router.push("/"));
  };

  return (
    <>
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
            // save currentSelectedTab's prompt
            const goal = goalMap.get(tab.id);
            const newGoalMap = new Map(goalMap);
            newGoalMap.set(tab.id, {
              id: tab.id ?? goal?.id,
              prompt: goalInputValue ?? goal?.prompt,
              index: tab.index,
              userId: goal?.userId ?? "",
              tooltip: goal?.tooltip,
              createdAt: goal?.createdAt ?? new Date(),
              updatedAt: new Date(),
            });
            setGoalMap(newGoalMap);
            setCurrentTabIndex(tab.index);
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
          <Typography level="body5">
            {tab.index} | {tab.id.slice(tab.id.length - 4)}
          </Typography>
        </Button>
      </Tab>
      <Divider orientation="vertical" />
    </>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ children }) => {
  const { goalMap, setGoalMap, currentTabIndex, setCurrentTabIndex } =
    useGoalStore();
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
              overflow: "scroll",
              maxWidth: "100%",
            }}
          >
            {entries.map(([_key, tab], _index) => (
              <HistoryTab
                key={tab.id}
                count={entries.length}
                tab={tab}
                currentTabIndex={currentTabIndex}
              />
            ))}
            {entries.length > 0 && (
              <Box className="justify-center align-middle">
                <IconButton
                  color="neutral"
                  variant="outlined"
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
