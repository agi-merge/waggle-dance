// GoalInput.tsx

import React, { useEffect, useState } from "react";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  Link,
  List,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { type CardProps } from "@mui/joy/Card";
import { useSession } from "next-auth/react";

import { api } from "~/utils/api";
import { type Handlers } from "~/pages";
import useApp from "~/stores/appStore";
import useGoal from "~/stores/goalStore";
import useHistory from "~/stores/historyStore";
import GoalDoctorModal from "./GoalDoctorModal";
import GoalSettings from "./GoalSettings";
import TemplatesModal from "./TemplatesModal";

export const examplePrompts = [
  "Create a Hacker News post title suggestion that is statistically likely to be successful. Determine the most successful types of Show HN titles in the last three months, with a special focus on AI produts.",
  "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
  "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize trends in the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid.",
  "What is the most popular event planning trend right now in April 2023?",
  "In nextjs 13, write a minimal example of a streaming API HTTP response that uses langchainjs CallbackHandler callbacks",
];

const placeholders = ["What's your goal? …Not sure? Check Examples!"];

interface GoalInputProps extends CardProps {
  callbacks: Handlers;
  startingValue?: string;
}

export default function GoalInput({
  callbacks,
  startingValue,
}: GoalInputProps) {
  const { goal } = useGoal();
  const { goalInputValue, setGoalInputValue } = useHistory();
  const { isPageLoading } = useApp();
  const [_currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [templatesModalOpen, setTemplatesModalOpen] =
    React.useState<boolean>(false);
  const { data: sessionData } = useSession();
  const { mutate } = api.goal.create.useMutation({
    onSuccess: () => {
      console.log("Goal saved!");
    },
    onError: (e) => {
      console.error("Failed to post!", e.message);
    },
  });

  useEffect(() => {
    if (startingValue) {
      setGoalInputValue(startingValue);
    }
  }, [startingValue, setGoalInputValue]);

  useEffect(() => {
    setGoalInputValue(goal);
  }, [goal, setGoalInputValue]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    callbacks.setGoal(goalInputValue);
    if (sessionData) void mutate({ prompt: goalInputValue });
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoalInputValue(event.target.value);
    callbacks.onChange(event.target.value);
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
      <FormControl>
        <Textarea
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
                  variant="solid"
                  color="neutral"
                  disabled={goalInputValue.trim().length === 0}
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
                  <Typography color="neutral" level="h5" className="px-5">
                    Examples
                  </Typography>
                  <Typography level="body2" className="px-5 pb-2">
                    For better results, try to{" "}
                    <Link
                      href="https://platform.openai.com/docs/guides/gpt-best-practices"
                      target="_blank"
                    >
                      follow GPT best practices
                    </Link>
                  </Typography>
                  <List className="absolute left-0 top-0 mt-3">
                    <Grid container spacing={2}>
                      {examplePrompts
                        .sort((a, b) => (a.length < b.length ? 1 : -1))
                        .map((prompt, _index) => (
                          <Grid key={prompt} sm={4} md={6}>
                            <Button
                              color="neutral"
                              variant="soft"
                              className="flex flex-grow flex-row justify-center"
                              onClick={() => {
                                setGoalInputValue(prompt);
                                callbacks.onChange(prompt);
                                setTemplatesModalOpen(false);
                              }}
                            >
                              <Typography
                                level="body4"
                                className="flex flex-grow flex-row justify-center"
                              >
                                {prompt}
                              </Typography>
                            </Button>
                          </Grid>
                        ))}
                    </Grid>
                  </List>
                </TemplatesModal>
                <Divider orientation="vertical" />
                <GoalDoctorModal>
                  <Typography color="info">Coming soon!</Typography>
                </GoalDoctorModal>
                <Divider orientation="vertical" />
                <GoalSettings />
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
          value={goalInputValue}
          onChange={handleChange}
        />
      </FormControl>

      <Stack direction="row-reverse" gap="1rem">
        <Button
          loading={isPageLoading}
          className="col-end mt-2"
          type="submit"
          disabled={goalInputValue.trim().length === 0}
        >
          Next
          <KeyboardArrowRight />
        </Button>
      </Stack>
    </form>
  );
}
