import React from "react";
import {
  Home,
  KeyboardArrowRight,
  Lan,
  ListAlt,
  Science,
} from "@mui/icons-material";
import {
  Button,
  CircularProgress,
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

import { useAppContext } from "~/pages/_app";
import useChainMachine from "../hooks/useWaggleDanceMachine";
import ForceGraph from "./ForceGraph";

interface WaggleDanceGraphProps extends StackProps {
  setHeaderExpanded: (expanded: boolean) => void;
}
const WaggleDanceGraph = ({ setHeaderExpanded }: WaggleDanceGraphProps) => {
  // TODO: I think this could be a bug - was fixing types here and noticed that the goal destructure was not being used
  // The goal prop was being used.  Set it the an unused _contextGoal for now.  Not sure this is
  // doing what we expect though.  Need to test.
  const { goal, isRunning, setIsRunning } = useAppContext();
  const { graphData, run } = useChainMachine({ goal });
  const handleStart = () => {
    setIsRunning(true);
    setHeaderExpanded(false);
    void run();
  };
  return (
    <Stack gap="1rem" className="mt-6 items-end">
      <Button
        disabled={!goal}
        className="col-end w-40 p-2"
        color="primary"
        loading={isRunning}
        href="waggle-dance"
        onClick={handleStart}
      >
        Start
      </Button>
      {graphData.links.length > 2 && (
        <Typography className="text-center" color="warning" level="body4">
          Demo will not proceed beyond planning.
        </Typography>
      )}
      {isRunning && graphData.links.length === 0 && (
        <Stack className="text-end">
          <Typography>Planning initial tasks…</Typography>
          <Typography level="body3">
            The first step can take several minutes…
          </Typography>
        </Stack>
      )}
      {graphData.links.length > 0 && (
        <Tabs
          defaultValue={0}
          sx={{ borderRadius: "lg" }}
          color="info"
          variant="outlined"
          className="max-h-96 w-full"
        >
          <TabList>
            <Tab>
              <ListAlt />
              <Typography>Log</Typography>
            </Tab>
            <Tab>
              <Lan />
              <Typography>Visualizer</Typography>
            </Tab>
            <Tab>
              <Science />
              <Typography>Results</Typography>
            </Tab>
          </TabList>
          <TabPanel
            value={0}
            className="relative h-96 w-full overflow-y-scroll p-4"
          >
            <List className="absolute left-0 top-0 mt-3 w-full  p-2">
              {graphData.nodes.map((n, idx) => (
                <ListItem key={`${idx}-${n.id}`}>
                  <ListItemButton>
                    <ListItemDecorator>
                      <Home />
                    </ListItemDecorator>
                    <ListItemContent>{n.id}</ListItemContent>
                    <KeyboardArrowRight />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </TabPanel>
          <TabPanel
            value={1}
            className="max-h-80 w-full items-center overflow-y-scroll p-4"
          >
            {graphData.links.length > 0 ? (
              <>
                <ForceGraph data={graphData} />
              </>
            ) : (
              isRunning && <CircularProgress />
            )}
          </TabPanel>
          <TabPanel value={2} className="text-center">
            <Typography>Coming soon</Typography>
          </TabPanel>
        </Tabs>
      )}
    </Stack>
  );
};

export default WaggleDanceGraph;
