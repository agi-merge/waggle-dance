import React from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Link, Tooltip, Typography } from "@mui/joy";

import GoalInput, { examplePrompts } from "~/components/GoalInput";
import { GoalInputState, useAppContext } from "./_app";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

const Home: NextPage = () => {
  const router = useRouter();
  const { setGoal, goalInputState, setGoalInputState } = useAppContext();

  // Define handleSetGoal function
  const handleSetGoal = (goal: string) => {
    if (goal.trim().length > 0) {
      router.push("/add-documents");
      setGoalInputState(GoalInputState.refine);
    } else {
      setGoalInputState(GoalInputState.start);
    }

    setGoal(goal);
  };
  return (
    <>
      <Typography level="body1">State your goal</Typography>
      <Typography level="body3">
        Don't be afraid of being ambitious. We will refine it later.{" "}
      </Typography>

      <Typography level="body3">
        <Tooltip
          title={
            <ul>
              {examplePrompts.map((p) => (
                <li>{p}</li>
              ))}
            </ul>
          }
        >
          <Link href="#">Need inspiration?</Link>
        </Tooltip>
      </Typography>
      <br />
      <GoalInput
        state={goalInputState}
        callbacks={{
          setGoal: handleSetGoal,
          onStop: () => {
            setGoalInputState(GoalInputState.start);
          },
        }}
      />
      {/* )} */}
    </>
  );
};

export default Home;
