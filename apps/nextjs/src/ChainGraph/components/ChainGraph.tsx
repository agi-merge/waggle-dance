import React from "react";
import { useRouter } from "next/router";
import { Home, KeyboardArrowRight, Lan, ListAlt } from "@mui/icons-material";
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
  setHeaderExpanded: (expanded: boolean) => void;
}
const ChainGraphSimulation = ({
  goal,
  setHeaderExpanded,
}: ChainGraphSimulationProps) => {
  const { goal: goal2, isRunning, setIsRunning } = useAppContext();
  const router = useRouter();
  const { graphData, run } = useChainMachine({ goal });
  const handleStart = () => {
    setIsRunning(true);
    setHeaderExpanded(false);
    run();
    setTimeout(() => {
      setIsRunning(false);
    }, 45000);
  };
  return (
    <Stack gap="1rem">
      <Stack direction="row-reverse" className="mt-2" gap="1rem">
        {isRunning && graphData.links.length === 0 && (
          <>
            <Typography>Planning initial tasks…</Typography>
            <Typography level="body3">
              Please be patient, this may take a moment…
            </Typography>
          </>
        )}
      </Stack>
      {graphData.links.length > 2 && (
        <Typography className="text-center" color="warning" level="body4">
          Demo is currently limited to the first set of tasks
        </Typography>
      )}
      {/* {graphData.links.length > 0 && ( */}
      <Tabs
        variant="solid"
        defaultValue={0}
        sx={{ minWidth: 300, borderRadius: "lg" }}
      >
        <TabList>
          <Tab>
            <Button
              disabled={!goal}
              className="col-end p-2"
              color="primary"
              loading={isRunning}
              href="waggle-dance"
              onClick={handleStart}
            >
              🐝💃!
            </Button>
            <Typography className="flex-grow pl-2 text-center">
              <ListAlt />
              Log
            </Typography>
          </Tab>
          <Tab>
            <Typography className="flex-grow pl-2 text-center">
              <Lan />
              Visualizer
            </Typography>
          </Tab>
        </TabList>
        <TabPanel value={0} className="20vh relative p-4">
          <List className="absolute left-0 top-0 mt-3 w-full overflow-y-scroll p-2">
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
            </>
          )}
        </TabPanel>
      </Tabs>
      {/* )} */}
    </Stack>
  );
};

export default ChainGraphSimulation;
