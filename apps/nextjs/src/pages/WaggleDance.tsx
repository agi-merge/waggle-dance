// WaggleDance.tsx
import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { List, ListItem, Stack, Typography } from "@mui/joy";

import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
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
          <Stack
            className="flex flex-grow cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setHeaderExpanded(!headerExpanded);
            }}
          >
            <Stack direction="row" className="flex">
              <Link
                href="#"
                className="flex-grow select-none pr-5 text-white"
                style={{ userSelect: "none" }}
              >
                <Typography level="h4">Waggle Dance</Typography>
              </Link>
              {headerExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </Stack>
            {headerExpanded && (
              <>
                <Typography level="body3" style={{ userSelect: "none" }}>
                  Waggle dancing is a process that allows large language models
                  like ChatGPT to collaborate with one another, with minimal
                  human input. The AI breaks the steps to achieve the goal down,
                  and self-corrects when it makes mistakes. This goes further,
                  faster than BabyAGI, AgentGPT or Auto-GPT.
                </Typography>
              </>
            )}

            {goal && (
              <>
                <Typography className="mb-2" level="body1">
                  Goal: <Typography level="body2">{goal}</Typography>
                </Typography>
              </>
            )}
          </Stack>
        </ListItem>
      </List>
      <WaggleDanceGraph goal={goal} setHeaderExpanded={setHeaderExpanded} />
    </>
  );
};

export default WaggleDance;
