import React from "react";
import { useRouter } from "next/router";
import { Home, KeyboardArrowRight, Lan, ListAlt } from "@mui/icons-material";
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
} from "@mui/joy";

import { useAppContext } from "~/pages/_app";
import useChainMachine from "../hooks/useWaggleDanceMachine";
import ForceGraph from "./ForceGraph";

interface WaggleDanceGraphProps {
  goal: string;
  setHeaderExpanded: (expanded: boolean) => void;
}
const WaggleDanceGraph = ({
  goal,
  setHeaderExpanded,
}: WaggleDanceGraphProps) => {
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
    <Stack gap="1rem" className="items-end">
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
            Please be patient, this may take a moment…
          </Typography>
        </Stack>
      )}
      {graphData.links.length > 0 && (
        <Tabs className="w-full" defaultValue={0} sx={{ borderRadius: "lg" }}>
          <TabList>
            <Tab>
              <ListAlt />
              <Typography>Log</Typography>
            </Tab>
            <Tab>
              <Lan />
              <Typography>Visualizer</Typography>
            </Tab>
          </TabList>
          <TabPanel
            value={0}
            className="relative max-h-80 w-full overflow-y-scroll p-4"
          >
            <List className="absolute left-0 top-0 mt-3 w-full  p-2">
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
          <TabPanel value={1} className="items-center">
            {graphData.links.length > 0 ? (
              <>
                <ForceGraph data={graphData} />
              </>
            ) : (
              isRunning && <CircularProgress />
            )}
          </TabPanel>
        </Tabs>
      )}
    </Stack>
  );
};

export default WaggleDanceGraph;
