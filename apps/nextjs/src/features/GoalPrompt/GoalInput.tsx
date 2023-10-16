// GoalInput.tsx

import React, { lazy, Suspense, useCallback, useState } from "react";
import router from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
  Skeleton,
} from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import Card, { type CardProps } from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
// import Grid from "@mui/joy/Grid";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { TRPCClientError } from "@trpc/client";
import { stringify } from "superjson";

import { examplePrompts } from "@acme/agent";
import { type AutoRefineFeedback } from "@acme/api/utils";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import AutoRefineGoalToggle from "../AgentSettings/components/AutoRefineGoalToggle";
import { TokenChip } from "./components/TokenChip";

const AgentSettingsToggleButton = lazy(
  () => import("../AgentSettings/components/AgentSettingsToggleButton"),
);
const AutoRefineFeedbackList = lazy(
  () => import("./components/AutoRefineGoalFeedbackList"),
);
const GoalForm = lazy(() => import("./components/GoalForm"));
const TemplatesModal = lazy(
  () => import("../AgentSettings/components/TemplatesModal"),
);

type GoalInputProps = CardProps;

export default function GoalInput({}: GoalInputProps) {
  const { getGoalInputValue, setGoalInputValue, upsertGoal, selectedGoal } =
    useGoalStore();
  const { setIsAutoStartEnabled } = useWaggleDanceMachineStore();
  const {
    isPageLoading,
    setIsPageLoading,
    isAutoRefineEnabled: _isAutoRefineEnabled,
    setError,
  } = useApp();
  const [templatesModalOpen, setTemplatesModalOpen] = useState<boolean>(false);
  const [feedback, _setFeedback] = useState<AutoRefineFeedback | null>(null);

  const { mutate: createGoal } = api.goal.create.useMutation({});
  const { mutate: refineGoal } = api.goal.refine.useMutation({});
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setIsPageLoading(true);
      const previousGoalId = selectedGoal?.id;

      function innerCreateGoal(prompt: string) {
        createGoal(
          { prompt },
          {
            onSuccess: (goal) => {
              console.debug(
                "saved goal, previousGoalId: ",
                previousGoalId,
                "goal: ",
                goal,
              );
              upsertGoal(goal, previousGoalId);
              void router.push(routes.goal({ id: goal.id }), undefined, {
                shallow: true,
              });
            },
            onError: (e) => {
              type HTTPStatusy = { httpStatus: number };
              if (e instanceof TRPCClientError) {
                const data = e.data as HTTPStatusy;
                // route for anonymous users
                if (data.httpStatus === 401 && selectedGoal) {
                  // this is a bit of terrible code that makes the state update to be able to waggle
                  selectedGoal.userId = "guest";
                  upsertGoal(selectedGoal);
                  void router.push(
                    routes.goal({ id: selectedGoal.id }),
                    undefined,
                    {
                      shallow: true,
                    },
                  );
                  return;
                }
              }
              if (e instanceof Error) {
                setError(e);
              }
              setIsPageLoading(false);
            },
          },
        );
      }

      if (_isAutoRefineEnabled) {
        refineGoal(
          { goal: getGoalInputValue() },
          {
            onSettled: (data, error: unknown) => {
              if (error || !data) {
                setIsPageLoading(false);
                if (error instanceof Error) {
                  setError(error);
                }
              } else {
                const { feedback, combinedRefinedGoal: _combinedRefinedGoal } =
                  data || {
                    feedback: [],
                    combinedRefinedGoal: "",
                  };

                if (feedback) {
                  const errorFeedback = feedback.find(
                    (f) => f.type === "error",
                  );
                  if (errorFeedback) {
                    setIsPageLoading(false);
                    setError(new Error(stringify(errorFeedback)));
                  } else {
                    // setFeedback(da);
                  }
                }
              }
            },
          },
        );
      } else {
        // setIsAutoStartEnabled(true);
        // this saves the goal to the database and routes to the goal page
        // unless the user is not logged in, in which case it routes to the goal page
        innerCreateGoal(getGoalInputValue());
      }
    },
    [
      setIsPageLoading,
      selectedGoal,
      _isAutoRefineEnabled,
      createGoal,
      upsertGoal,
      setError,
      refineGoal,
      getGoalInputValue,
    ],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoalInputValue(event.target.value);
  };

  const _handleAutostartChanged = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsAutoStartEnabled(event.target.checked);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      height="100%"
    >
      <Suspense fallback={<Skeleton variant="rectangular" height={100} />}>
        <GoalForm
          isPageLoading={isPageLoading}
          getGoalInputValue={getGoalInputValue}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
        />
      </Suspense>

      <Box>
        <Stack
          direction="row"
          gap="0.5rem"
          sx={{
            marginTop: { xs: "-4.1rem", sm: "-4.25rem" },
            paddingX: { xs: 1, sm: 2 },
            borderRadius: 2,
          }}
        >
          <TokenChip prompt={selectedGoal?.prompt || ""} />
          <Divider orientation="vertical" />
          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            disabled={getGoalInputValue().trim().length === 0}
            onClick={() => {
              setGoalInputValue("");
            }}
            sx={{
              marginRight: -0.4,
              paddingX: { xs: 0.5, sm: 2 },
              borderRadius: 2,
              fontSize: { xs: "xs", sm: "sm" },
            }}
          >
            Clear
          </Button>
          <Divider orientation="vertical" />
          <Suspense fallback={<Skeleton variant="rectangular" height={100} />}>
            <TemplatesModal
              open={templatesModalOpen}
              setOpen={setTemplatesModalOpen}
            >
              <List
                variant="soft"
                sx={{
                  borderRadius: "sm",
                }}
                size="lg"
              >
                {Object.entries(examplePrompts)
                  .sort((a, b) => (a.length < b.length ? 1 : -1))
                  .map(([category, prompts], index) => (
                    <ListItem nested key={index}>
                      {index !== 0 && <Divider />}
                      <ListSubheader variant="soft" sx={{ p: 1, m: 1 }}>
                        {category}
                      </ListSubheader>
                      {index !== prompts.length - 1 && <Divider />}
                      <List size="sm" component={Card} variant="outlined">
                        {prompts.map((prompt) => (
                          <React.Fragment key={`${category}_${prompt.tags}`}>
                            <ListItem>
                              <ListItemButton
                                onClick={() => {
                                  setGoalInputValue(prompt.prompt);
                                  setTemplatesModalOpen(false);
                                }}
                              >
                                <div>
                                  <Typography level="title-sm">
                                    {prompt.title}
                                  </Typography>
                                  <Typography level="body-xs">
                                    {prompt.prompt}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    gap={1}
                                    sx={{ pt: 0.5 }}
                                  >
                                    {prompt.tags.map((tag, i) => (
                                      <Chip
                                        key={i}
                                        variant="outlined"
                                        size="sm"
                                      >
                                        {tag}
                                      </Chip>
                                    ))}
                                  </Stack>
                                </div>
                              </ListItemButton>
                            </ListItem>
                            <Divider />
                          </React.Fragment>
                        ))}
                      </List>
                    </ListItem>
                  ))}
              </List>
            </TemplatesModal>
          </Suspense>
          <Divider orientation="vertical" />
          <AutoRefineGoalToggle />
        </Stack>
      </Box>
      <Suspense
        fallback={
          <Skeleton variant="rectangular" height={feedback ? 100 : 0} />
        }
      >
        <AutoRefineFeedbackList feedback={feedback} />
      </Suspense>
      <Box className="max-w-screen flex items-center justify-end">
        <Stack direction="row-reverse" gap="1rem" className="pb-4">
          <Button
            loading={isPageLoading}
            className="col-end mt-2"
            type="submit"
            variant="soft"
            disabled={getGoalInputValue().trim().length === 0}
            onClick={handleSubmit}
          >
            Next
            <KeyboardArrowRight />
          </Button>
          <Box
            className="items-center justify-center text-center align-top"
            component={Stack}
            gap={0.5}
          >
            <Suspense
              fallback={
                <Skeleton
                  variant="text"
                  width={"100%"}
                  height={162}
                  animation={"wave"}
                  loading={true}
                />
              }
            >
              <AgentSettingsToggleButton />
            </Suspense>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
