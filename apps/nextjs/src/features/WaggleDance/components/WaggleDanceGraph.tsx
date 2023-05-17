import React from "react";
import { KeyboardArrowRight, Lan, ListAlt, Science } from "@mui/icons-material";
import {
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Typography,
  type StackProps,
} from "@mui/joy";

import useApp from "~/stores/appStore";
import useGoal from "~/stores/goalStore";
import useChainMachine from "../hooks/useWaggleDanceMachine";
import ForceGraph from "./ForceGraph";

interface WaggleDanceGraphProps extends StackProps {
  setHeaderExpanded: (expanded: boolean) => void;
}
const WaggleDanceGraph = ({ setHeaderExpanded }: WaggleDanceGraphProps) => {
  const { isRunning, setIsRunning } = useApp();
  const { goal } = useGoal();
  const { graphData, dag, run } = useChainMachine({ goal });
  const handleStart = () => {
    setIsRunning(true);
    setHeaderExpanded(false);
    void run();
  };
  const handleStop = () => {
    setIsRunning(false);
  };
  const button = (
    <Stack gap="1rem" className="mt-6 items-end">
      <Button
        // disabled={!goal}
        className="col-end w-40 p-2"
        color="primary"
        href="waggle-dance"
        onClick={isRunning ? handleStop : handleStart}
      >
        {isRunning ? "Stop" : "Start"}
      </Button>
    </Stack>
  );
  return (
    <Stack gap="1rem" className="mt-6">
      {!isRunning && button}
      {dag.edges.length > 2 && (
        <Typography className="text-center" color="warning" level="body4">
          Demo will not proceed beyond planning.
        </Typography>
      )}
      {isRunning && dag.edges.length <= 1 && (
        <Stack className="text-center">
          <Typography level="h5" color="primary">
            Please 🐝 patient,{" "}
            <Typography color="neutral">planning initial tasks…</Typography>
          </Typography>
          <Typography level="body3">
            This important first step can take several minutes…
          </Typography>
        </Stack>
      )}
      {
        <Tabs
          defaultValue={1}
          sx={{ borderRadius: "lg" }}
          variant="soft"
          className="max-h-96 w-full"
        >
          <TabList>
            <Tab>
              <ListAlt />
              <Typography>Agents</Typography>
            </Tab>
            <Tab>
              <Lan />
              <Typography>Graph</Typography>
            </Tab>
            <Tab>
              <Science />
              <Typography>Results</Typography>
            </Tab>
          </TabList>
          {isRunning && (
            <>
              <LinearProgress />
              <TabPanel
                value={0}
                className="relative h-96 w-full overflow-y-scroll p-4"
              >
                <List className="absolute left-0 top-0 mt-3 w-full  p-2">
                  {dag.nodes.map((n) => (
                    <ListItem key={n.id}>
                      <ListItemButton>
                        <ListItemDecorator>
                          <Typography color="primary" level="body2">
                            {n.id}
                          </Typography>
                        </ListItemDecorator>
                        <ListItemContent>
                          <Typography>{n.name}</Typography>
                          <Typography level="body3">
                            {n.action}{" "}
                            <Typography level="body5">
                              {JSON.stringify(n.params)}
                            </Typography>
                          </Typography>
                        </ListItemContent>
                        <KeyboardArrowRight />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              <TabPanel
                value={1}
                className="min-h-90 w-full items-center overflow-y-scroll p-4"
              >
                <Typography level="body4" className="p-3 text-center">
                  Each tier executes concurrently | top down | subject to both
                  your review and AI review
                </Typography>
                <ForceGraph data={graphData} />
              </TabPanel>
              <TabPanel value={2} className="text-center">
                <Typography>Coming soon</Typography>
              </TabPanel>
            </>
          )}
        </Tabs>
      }
      {isRunning && button}
    </Stack>
  );
};

export default WaggleDanceGraph;
