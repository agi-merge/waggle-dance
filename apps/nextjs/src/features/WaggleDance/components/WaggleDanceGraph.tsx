import React from "react";
import { KeyboardArrowRight, Lan, ListAlt, Science } from "@mui/icons-material";
import {
  Button,
  Card,
  Input,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Sheet,
  Stack,
  Tab,
  TabList,
  TabPanel,
  Table,
  Tabs,
  Tooltip,
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
// shows the graph, agents, results, general messages and chat input
const WaggleDanceGraph = ({ setHeaderExpanded }: WaggleDanceGraphProps) => {
  const { isRunning, setIsRunning } = useApp();
  const { goal } = useGoal();
  const { graphData, dag, run } = useChainMachine({ goal });
  const [chatInput, setChatInput] = React.useState("");
  const handleStart = () => {
    setIsRunning(true);
    setHeaderExpanded(false);
    void run();
  };
  const handleStop = () => {
    setIsRunning(false);
  };
  const button = (
    <Stack
      direction={isRunning ? "row" : "column"}
      gap="1rem"
      className="flex items-end"
    >
      {isRunning && (
        <Tooltip title="Coming soon!" color="info">
          <Input
            variant="outlined"
            className="flex-grow"
            placeholder="Send your feedback to the AI swarm…"
            onKeyUp={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setChatInput("");
                // handleSubmit(event);
              }
            }}
            onChange={(event) => {
              setChatInput(event.target.value);
              // handleChange(event);
            }}
            value={chatInput}
          />
        </Tooltip>
      )}
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
      {dag.nodes.length > 0 && (
        <Card variant="outlined">
          <Tabs
            aria-label="Waggle Dance Status and Results"
            defaultValue={1}
            color="neutral"
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
              {dag.init.predicate && (
                <Tab>
                  <Science />
                  <Typography>Results</Typography>
                </Tab>
              )}
            </TabList>
            {dag.nodes.length > 0 && (
              <>
                {isRunning && <LinearProgress thickness={3} />}
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
                              <Typography level="body5" color="info">
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
                  Work in progres…
                  {dag.init.predicate && (
                    <Sheet>
                      <Table aria-label="Results table">
                        <thead>
                          <tr>
                            <th>State</th>
                            <th>Predicate</th>
                            <th>Parameters</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Initial</td>
                            <td>{dag.init.predicate}</td>
                            <td>
                              <pre>
                                <code>
                                  {JSON.stringify(dag.init.params, null, 2)}
                                </code>
                              </pre>
                            </td>
                          </tr>
                          <tr>
                            {/* <td>Current</td>
                          <td>{dag.goal.predicate}</td>
                          <td>
                            <pre>
                              <code>
                                {JSON.stringify(dag.goal.params, null, 2)}
                              </code>
                            </pre>
                          </td>
                        </tr> */}
                            <td>Goal</td>
                            <td>{dag.goal.predicate}</td>
                            <td>
                              <pre>
                                <code>
                                  {JSON.stringify(dag.goal.params, null, 2)}
                                </code>
                              </pre>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Sheet>
                  )}
                </TabPanel>
              </>
            )}
          </Tabs>
        </Card>
      )}
      {isRunning && button}
    </Stack>
  );
};

export default WaggleDanceGraph;
