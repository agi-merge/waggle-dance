// WaggleDance.tsx
import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { List, ListItem, ListItemButton, Stack, Typography } from "@mui/joy";

import WaggleDanceGraph from "~/WaggleDance/components/WaggleDanceGraph";
import { useAppContext } from "./_app";

// interface WaggleDanceProps {
//   goal: string;
//   onDelete?: () => void;
// }
// AKA goal solver
const WaggleDance: NextPage = (/*{ goal, onDelete }: WaggleDanceProps*/) => {
  const router = useRouter();
  const { goal } = useAppContext();
  const [headerExpanded, setHeaderExpanded] = useState(true);

  useEffect(() => {
    // Redirect if the goal is undefined or empty
    if (!goal) {
      router.push("/");
    }
  }, [goal, router]);
  return (
    <>
      <List className="m-0 p-0" color="primary">
        <ListItem>
          <ListItemButton
            onClick={(e) => {
              e.preventDefault();
              setHeaderExpanded(!headerExpanded);
            }}
          >
            <Stack>
              {headerExpanded && (
                <Typography level="body1" style={{ userSelect: "none" }}>
                  {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                  Waggle Dance
                </Typography>
              )}
              {headerExpanded && (
                <>
                  <Typography level="body3" style={{ userSelect: "none" }}>
                    Waggle dancing is a process that allows large language
                    models like ChatGPT to collaborate with one another, with
                    minimal human input. The AI breaks the steps to achieve the
                    goal down, and self-corrects when it makes mistakes. This
                    goes further, faster than BabyAGI, AgentGPT or Auto-GPT.
                  </Typography>
                </>
              )}

              {goal && (
                <>
                  <Typography className="mb-2" level="body1">
                    {!headerExpanded && <KeyboardArrowDown />}
                    Goal: <Typography level="body2">{goal}</Typography>
                  </Typography>
                </>
              )}
            </Stack>
          </ListItemButton>
        </ListItem>
      </List>
      <WaggleDanceGraph goal={goal} setHeaderExpanded={setHeaderExpanded} />
    </>
  );
};

export default WaggleDance;
