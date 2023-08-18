// GoalInput.tsx

import React, { useCallback, useEffect, useState } from "react";
import router from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import { type CardProps } from "@mui/joy/Card";
import Checkbox from "@mui/joy/Checkbox";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
// import Grid from "@mui/joy/Grid";
import Link from "@mui/joy/Link";
import List from "@mui/joy/List";
import Stack from "@mui/joy/Stack";
import Textarea from "@mui/joy/Textarea";
import Typography from "@mui/joy/Typography";
import { TRPCClientError } from "@trpc/client";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import GoalDoctorModal from "./GoalDoctorModal";
import GoalSettings from "./GoalSettings";
import TemplatesModal from "./TemplatesModal";

export const examplePrompts = [
  "I am launching a product. I want to come up with more strategies to add to the product launch plan, as well as create ten 'Show HN' post titles. The post titles should take into account top show hn posts from the last three months for open source ai product launches. The product can be understood by visiting https://waggledance.ai (source code at https://github.com/agi-merge/waggle-dance).",
  "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
  "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize trends in the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid.",
  "What is the most popular event planning trend right now in April 2023?",
  "In nextjs 13, write a minimal example of a streaming API HTTP response that uses langchainjs CallbackHandler callbacks",
];

const placeholders = ["What's your goal? …Not sure? Check Examples!"];

type GoalPromptInputProps = CardProps;

export default function GoalPromptInput({}: GoalPromptInputProps) {
  const { getGoalInputValue, setGoalInputValue, upsertGoal, selectedGoal } =
    useGoalStore();
  const { isAutoStartEnabled, setIsAutoStartEnabled } =
    useWaggleDanceMachineStore();
  const { isPageLoading, setIsPageLoading } = useApp();
  const [_currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [templatesModalOpen, setTemplatesModalOpen] = useState<boolean>(false);

  const { mutate: createGoal } = api.goal.create.useMutation({});

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setIsPageLoading(true);
      const previousGoalId = selectedGoal?.id;
      // setIsAutoStartEnabled(true);
      // this saves the goal to the database and routes to the goal page
      // unless the user is not logged in, in which case it routes to the goal page
      createGoal(
        { prompt: getGoalInputValue() },
        {
          onSuccess: (goal) => {
            console.debug(
              "saved goal, previousGoalId: ",
              previousGoalId,
              "goal: ",
              goal,
            );
            upsertGoal(goal, previousGoalId);
            void router.push(routes.goal(goal.id), undefined, {
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
                void router.push(routes.goal(selectedGoal.id), undefined, {
                  shallow: true,
                });
              }
            } else {
              setIsPageLoading(false);
            }
          },
        },
      );
    },
    [setIsPageLoading, createGoal, getGoalInputValue, selectedGoal, upsertGoal],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoalInputValue(event.target.value);
  };

  const handleAutostartChanged = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsAutoStartEnabled(event.target.checked);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromptIndex((prevIndex) =>
        prevIndex + 1 >= examplePrompts.length ? 0 : prevIndex + 1,
      );
      setCurrentPlaceholderIndex((prevIndex) =>
        prevIndex + 1 >= placeholders.length ? 0 : prevIndex + 1,
      );
    }, 5000); // The tooltip title will change every 5 seconds.

    return () => clearInterval(timer);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-2">
      <FormControl disabled={isPageLoading}>
        <Textarea
          autoFocus
          id="goalTextarea"
          name="goalTextarea"
          placeholder={placeholders[currentPlaceholderIndex]}
          minRows={3}
          maxRows={10}
          endDecorator={
            <Box>
              <Stack direction="row" gap="0.5rem">
                <Button
                  size="sm"
                  variant="outlined"
                  color="neutral"
                  disabled={getGoalInputValue().trim().length === 0}
                  onClick={() => {
                    setGoalInputValue("");
                  }}
                >
                  Clear
                </Button>
                <Divider orientation="vertical" />
                <TemplatesModal
                  open={templatesModalOpen}
                  setOpen={setTemplatesModalOpen}
                >
                  <Typography color="neutral" level="title-lg" className="px-5">
                    Examples
                  </Typography>
                  <Typography level="body-md" className="px-5 pb-2">
                    For better results, try to{" "}
                    <Link
                      href="https://platform.openai.com/docs/guides/gpt-best-practices"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      follow GPT best practices
                    </Link>
                  </Typography>
                  <List className="absolute left-0 top-0 mt-3">
                    <Stack spacing={2}>
                      {examplePrompts
                        .sort((a, b) => (a.length < b.length ? 1 : -1))
                        .map((prompt, _index) => (
                          <Stack key={prompt}>
                            <Button
                              color="neutral"
                              size="sm"
                              variant="outlined"
                              className="flex flex-grow flex-row justify-center"
                              onClick={() => {
                                setGoalInputValue(prompt);
                                setTemplatesModalOpen(false);
                              }}
                            >
                              <Typography
                                level="body-sm"
                                className="flex flex-grow flex-row justify-center"
                              >
                                {prompt}
                              </Typography>
                            </Button>
                          </Stack>
                        ))}
                    </Stack>
                  </List>
                </TemplatesModal>
                <Divider orientation="vertical" />
                <GoalDoctorModal>
                  <Typography color="neutral">Coming soon!</Typography>
                </GoalDoctorModal>
              </Stack>
            </Box>
          }
          size="lg"
          required
          variant="outlined"
          className="py-col flex-grow"
          onKeyPress={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
          value={getGoalInputValue()}
          onChange={handleChange}
        />
      </FormControl>

      <Box className="max-w-screen flex items-center justify-end">
        <Stack direction="row-reverse" gap="1rem" className="pb-4">
          <Button
            loading={isPageLoading}
            className="col-end mt-2"
            type="submit"
            variant="soft"
            disabled={getGoalInputValue().trim().length === 0}
          >
            Next
            <KeyboardArrowRight />
          </Button>
          <Box
            className="items-center justify-center text-center align-top"
            component={Stack}
            gap={0.5}
          >
            <Checkbox
              size="sm"
              checked={isAutoStartEnabled}
              onChange={handleAutostartChanged}
              label={<Typography>Autostart Goal</Typography>}
            >
              Autostart
            </Checkbox>

            <Divider />
            <GoalSettings />
          </Box>
        </Stack>
      </Box>
    </form>
  );
}
