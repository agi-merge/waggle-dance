import React from "react";
import { Label } from "@mui/icons-material";
import {
  Button,
  Card,
  FormControl,
  FormHelperText,
  FormLabel,
  Textarea,
} from "@mui/joy";

export default function GoalInput() {
  const fart = "hi";
  return (
    <Card color="neutral">
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <FormControl>
          <FormLabel>Label</FormLabel>
          <Textarea
            placeholder="What's your goal?"
            minRows={2}
            size="lg"
            required
            variant="outlined"
          />
          {/* <FormHelperText>This is a helper text.</FormHelperText> */}
        </FormControl>
        <Button className="col-end" type="submit">
          Submit
        </Button>
      </form>
    </Card>
  );
}
