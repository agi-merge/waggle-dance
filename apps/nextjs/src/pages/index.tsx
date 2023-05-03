import React, { useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import {
  Link,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/joy";

import GoalInput, { examplePrompts } from "~/components/GoalInput";
import { GoalInputState, useAppContext } from "./_app";

export interface Handlers {
  setGoal: (goal: string) => void;
  onStop: () => void;
}

const Home: NextPage = () => {
  const router = useRouter();
  const { setGoal, goalInputState, setGoalInputState } = useAppContext();
  const [headerExpanded, setHeaderExpanded] = useState(true);

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
      <List className="m-0 p-0">
        <ListItem>
          <ListItemButton
            onClick={(e) => {
              e.preventDefault();
              setHeaderExpanded(!headerExpanded);
            }}
          >
            <Stack>
              <Typography level="body1" style={{ userSelect: "none" }}>
                {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                State your Goal
              </Typography>
              {headerExpanded && (
                <>
                  <Typography level="body3" style={{ userSelect: "none" }}>
                    Don't be afraid of being ambitious. We will refine it later.{" "}
                  </Typography>
                  <Typography level="body3" style={{ userSelect: "none" }}>
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
                </>
              )}
            </Stack>
          </ListItemButton>
        </ListItem>
      </List>
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
