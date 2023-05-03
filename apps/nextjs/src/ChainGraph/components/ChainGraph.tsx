import React from "react";
import { Home, KeyboardArrowRight, ListAlt } from "@mui/icons-material";
import {
  Button,
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
} from "@mui/joy";

import { useAppContext } from "~/pages/_app";
import useChainMachine from "../hooks/useChainMachine";
import ForceGraph from "./ForceGraph";

interface ChainGraphSimulationProps {
  goal: string;
}
const ChainGraphSimulation = ({ goal }: ChainGraphSimulationProps) => {
  const { goal: goal2 } = useAppContext();
  const { graphData, run } = useChainMachine({ goal });
  const [isRunning, setIsRunning] = React.useState(false);
  const handleStart = () => {
    setIsRunning(true);
    run();
  };
  return (
    <Stack gap="2rem">
      <Button
        disabled={!goal && !goal2}
        loading={isRunning}
        onClick={handleStart}
      >
        Run
      </Button>
      <Tabs defaultValue={1} sx={{ minWidth: 300, borderRadius: "lg" }}>
        <TabList variant="outlined" color="neutral">
          <Tab>
            <ListAlt />
            <Typography className="pl-2">Log</Typography>
          </Tab>
          <Tab>
            <Typography>Visualizer</Typography>
          </Tab>
        </TabList>
        <TabPanel value={0}>
          <List className="max-h-screen">
            {graphData.nodes.map((n) => (
              <ListItem>
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
        <TabPanel value={1}>
          {graphData.links.length > 0 && (
            <>
              <ForceGraph data={graphData} />
              {graphData.links.length > 2 && (
                <Typography
                  className="text-center"
                  color="warning"
                  level="body5"
                >
                  Demo is currently limited to the first set of tasks
                </Typography>
              )}
            </>
          )}
        </TabPanel>
      </Tabs>
    </Stack>
  );
};

export default ChainGraphSimulation;
