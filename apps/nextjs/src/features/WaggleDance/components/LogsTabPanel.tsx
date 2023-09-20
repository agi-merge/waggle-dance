import {
  Box,
  List,
  ListDivider,
  ListItem,
  Stack,
  TabPanel,
  Typography,
} from "@mui/joy";

import { type LogMessage } from "../hooks/useWaggleDanceAgentExecutor";

type LogsTabPanelProps = {
  logs: LogMessage[];
};
const LogsTabPanel = ({ logs }: LogsTabPanelProps) => {
  return (
    <TabPanel value={3} className="w-full overflow-y-scroll p-4">
      <List
        className="absolute left-0 top-0 mt-3"
        sx={{
          marginX: { xs: -2, sm: 0 },
        }}
        aria-label="Log List"
      >
        {logs.map((log) => (
          <Box key={`${log.timestamp.toString()}-${log.message}`}>
            <ListItem className="overflow-x-scroll">
              <Stack
                direction="row"
                className="max-h-24 overflow-x-scroll"
                gap="1rem"
              >
                <Typography
                  fontFamily="Monospace"
                  variant="soft"
                  color="neutral"
                  level="body-md"
                >
                  {log.timestamp.toISOString().split("T")[1]}
                </Typography>
                <Typography fontFamily="Monospace" color="success">
                  {log.type}
                </Typography>
                <Typography
                  fontFamily="Monospace"
                  color="neutral"
                  className="max-w-24 max-h-24 flex-shrink"
                >
                  {log.message}
                </Typography>
              </Stack>
            </ListItem>
            <ListDivider inset="gutter" />
          </Box>
        ))}
      </List>
    </TabPanel>
  );
};

export default LogsTabPanel;
