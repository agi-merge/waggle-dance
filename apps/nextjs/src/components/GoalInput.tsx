import React, { useEffect, useState } from "react";
import { Info, KeyboardArrowRight } from "@mui/icons-material";
import {
  Button,
  Card,
  FormControl,
  FormLabel,
  IconButton,
  Link,
  Stack,
  Textarea,
  Tooltip,
  Typography,
} from "@mui/joy";

import { Handlers } from "~/pages";
import { GoalInputState } from "~/pages/_app";

const examplePrompts = [
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
  "What do you want to know?",
  "Is there an abstract concept that you want to understand?",
  "Add a feature to a GitHub repository?",
  "Try something that ChatGPT might be not able to do!",
];

interface GoalInputProps {
  state?: GoalInputState;
  callbacks: Handlers; // Update the type of callbacks
}

export default function GoalInput({ state, callbacks }: GoalInputProps) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [goalInputValue, setGoalInputValue] = useState(
    "",
    //examplePrompts[(Math.random() * examplePrompts.length) | 0],
  );
  const [tooltipTappedOpen, setTooltipTappedOpen] = useState<
    boolean | undefined
  >(undefined);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (state !== GoalInputState.start) {
      callbacks.onStop();
    } else {
      callbacks.setGoal(goalInputValue);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoalInputValue(event.target.value);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromptIndex((prevIndex) =>
        prevIndex + 1 >= examplePrompts.length ? 0 : prevIndex + 1,
      );
      setCurrentPlaceholderIndex((prevIndex) =>
        prevIndex + 1 >= placeholders.length ? 0 : prevIndex + 1,
      );
    }, 5000); // The tooltip title will change every 3 seconds.

    return () => clearInterval(timer);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <FormControl>
        <Tooltip
          title={
            <div className="max-w-sm">
              <Typography color="info">
                Try a complex task or question that you perform in your
                profession. <Typography color="neutral">e.g.</Typography>
              </Typography>
              <Typography level="body1" className="mt-2">
                {examplePrompts[currentPromptIndex]}
              </Typography>
            </div>
          }
          enterDelay={1500}
          variant="outlined"
          arrow
          color="info"
          open={tooltipTappedOpen}
          placement="bottom-end"
        >
          <Stack direction="row" gap="1em" className="items-center">
            <IconButton
              aria-label="Open in new tab"
              color="neutral"
              onClick={() => {
                // if (tooltipTappedOpen) {
                //   setTooltipTappedOpen(undefined);
                // } else {
                setTooltipTappedOpen(true);
                // }
              }}
            >
              <Info color="info" />
            </IconButton>
            <Textarea
              id="goalTextarea"
              name="goalTextarea"
              placeholder={placeholders[currentPlaceholderIndex]}
              minRows={3}
              maxRows={10}
              size="lg"
              disabled={state !== GoalInputState.start}
              required
              variant="outlined"
              className="py-col flex-grow"
              onKeyPress={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              value={goalInputValue}
              onChange={handleChange}
            />
          </Stack>
        </Tooltip>
      </FormControl>

      <Stack direction="row-reverse" gap="1rem">
        <Button
          className="col-end mt-2"
          type="submit"
          disabled={
            state === GoalInputState.start && goalInputValue.trim().length === 0
          }
        >
          Add Docs
          <KeyboardArrowRight />
        </Button>
      </Stack>
    </form>
  );
}
