// GoalInput.tsx

import React, { useEffect, useState } from "react";
import { KeyboardArrowRight } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  List,
  Stack,
  Textarea,
  Typography,
} from "@mui/joy";
import { type CardProps } from "@mui/joy/Card";

import { type Handlers } from "~/pages";
import GoalDoctorModal from "./GoalDoctorModal";
import GoalSettings from "./GoalSettings";
import TemplatesModal from "./TemplatesModal";

export const examplePrompts = [
  "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
  "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize trends in the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid.",
  "What is the most popular event planning trend right now in April 2023?",
  "Who came in fourth place in the latest golf major?",
  "How do fluctuations in mortgage interest rates affect the demand for home loans in the current market?",
  "How does the current competitive landscape in the renewable energy sector influence market strategy?",
  "How are electric vehicle charging infrastructure regulations evolving in response to the rapid growth of EV adoption?",
  "What are the implications of the most recent antitrust investigations on major tech companies?",
  "What are the top five rising star SaaS startups serving sales teams?",
  "in nextjs 13, write a minimal example of a streaming API HTTP response that uses langchainjs CallbackHandler callbacks",
];

const placeholders = [
  "What's your goal?",
  "Is there an un-Googleable topic that you want to explore?",
  "Add a feature to a GitHub repository?",
  "Do your taxes?",
  "Try something that ChatGPT might be not able to do!",
  "Achieve global peace and equity for all?",
];

interface GoalInputProps extends CardProps {
  callbacks: Handlers;
  startingValue?: string;
}

export default function GoalInput({
  callbacks,
  startingValue,
}: GoalInputProps) {
  const [_currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [goalInputValue, setGoalInputValue] = useState(
    process.env.NODE_ENV === "development"
      ? "Write a 1000+ word markdown document (GFM / Github flavored markdown). Research and summarize trends in the multi-family housing trends in San Francisco and surrounding areas. Create tables and figures that compare and contrast, and display relevant data to support the metrics. Afterwards, add citations, ensuring that URLs are valid."
      : "",
    //examplePrompts[(Math.random() * examplePrompts.length) | 0],
  );
  const [templatesModalOpen, setTemplatesModalOpen] =
    React.useState<boolean>(false);

  useEffect(() => {
    if (startingValue) {
      setGoalInputValue(startingValue);
    }
  }, [startingValue]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    callbacks.setGoal(goalInputValue);
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
                  <Typography color="info" level="h6" className="p-5">
                    Template builder coming soon! For now, examples:
                  </Typography>
                  <List className="h-96 overflow-auto">
                    <Grid container spacing={2}>
                      {examplePrompts.map((prompt, _index) => (
                        <Grid key={prompt} sm={4} md={6}>
                          <Button
                            color="info"
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
