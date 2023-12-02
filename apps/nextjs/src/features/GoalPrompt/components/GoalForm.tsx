// GoalForm.tsx
import type { FormEvent } from "react";
import React from "react";
import { FormControl, Textarea } from "@mui/joy";

interface GoalFormProps {
  isPageLoading: boolean;
  getGoalInputValue: () => string;
  handleChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (event: FormEvent) => void;
}

export default function GoalForm({
  isPageLoading,
  getGoalInputValue,
  handleChange,
  handleSubmit,
}: GoalFormProps) {
  return (
    <form onSubmit={handleSubmit} className="my-3 space-y-2 pb-2">
      <FormControl disabled={isPageLoading}>
        <Textarea
          id="goalTextarea"
          name="goalTextarea"
          placeholder={"What's your goal? …Not sure? Check Examples!"}
          minRows={3}
          maxRows={10}
          size="lg"
          required
          variant="outlined"
          className="py-col flex-grow pb-10"
          value={getGoalInputValue()}
          onChange={handleChange}
          sx={{ pb: 8 }}
        ></Textarea>
      </FormControl>
    </form>
  );
}
