import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Close } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  Typography,
  type TabsProps,
} from "@mui/joy";
import { v4 } from "uuid";

import { api } from "~/utils/api";
import theme from "~/styles/theme";

export interface HistoryTab {
  id: string;
  index: number;
  label: string;
  tooltip?: string;
  selectedByDefault?: boolean;
}

interface HistoryTabProps {
  tab: HistoryTab;
  currentTabIndex: number;
  count: number;
  onSelect?: (tab: HistoryTab) => void; // if falsy, tab is not selectable and is treated as the plus button
}

interface HistoryTabberProps extends TabsProps {
  tabs: HistoryTab[];
  children: React.ReactNode;
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  tab,
  currentTabIndex,
  count,
  onSelect,
}) => {
  const router = useRouter();
  const del = api.goal.delete.useMutation();
  const { data: historicGoals, refetch } = api.goal.topByUser.useQuery(
    undefined,
    {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      onSuccess: (data) => {
        console.log("Success!", data);
      },
    },
  );
  const closeHandler = async (tab: HistoryTab) => {
    await del.mutateAsync(tab.id);
    const goals = await refetch();
    (goals.data?.length ?? 0) === 0 && (await router.push("/"));
  };

  return (
    <Tab
      key={tab.id}
      className={`text-overflow-ellipsis m-0 flex items-start overflow-hidden p-0`}
      sx={{
        maxWidth: `${100 / count - 3}%`,
        background: theme.palette.background.tooltip,
      }}
      variant="outlined"
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
      onSelect={(e) => {
        if (!onSelect) e.preventDefault();
      }}
      onBlur={(e) => {
        if (!onSelect) e.preventDefault();
      }}
      onClick={(e) => {
        if (onSelect) {
          onSelect(tab);
        } else {
          e.preventDefault();
        }
      }}
    >
      <Stack
        spacing={1}
        direction="row"
        alignItems="center"
        useFlexGap
        className="overflow-hidden"
      >
        {onSelect && (
          <IconButton
            size="sm"
            color="neutral"
            variant="plain"
            onClick={() => {
              void closeHandler(tab);
            }}
          >
            <Close />
          </IconButton>
        )}
        <Typography noWrap className="overflow-clip">
          {tab.label.length < 55 ? tab.label : `${tab.label.slice(0, 55)}…`}
        </Typography>
      </Stack>
      {/* <Box sx={{ flexGrow: 1, overflow: "hidden", px: 3 }}>
        <Stack
          direction="row"
          gap="0.25rem"
          useFlexGap
          className={`w-1/${count}`}
        >
          {onSelect && (
            <IconButton
              size="sm"
              color="neutral"
              variant="plain"
              onClick={() => {
                void closeHandler(tab);
              }}
            >
              <Close />
            </IconButton>
          )}
          <Typography
            className={`text-ellipsis pl-2`}
            sx={{ textOverflow: "ellipsis" }}
            noWrap
          >
            {tab.label}
          </Typography>
        </Stack>
      </Box> */}
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ tabs, children }) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [plusUUID] = useState(v4());
  // const { setHistoryData } = useHistory();
  // Set the default tab if it exists on first component mount
  useEffect(() => {
    const defaultTab = tabs.find((tab) => tab.selectedByDefault === true);

    if (defaultTab) {
      setCurrentTabIndex(defaultTab.index);
    }
  }, [tabs]);

  // Handle tab change
  const handleChange = (
    event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    if (newValue === tabs.length - 1) {
      event?.preventDefault();
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);
  };

  const plusTab = () => {
    return {
      id: plusUUID,
      index: tabs.length,
      label: "+",
      tooltip: "🐝 Start wagglin' and your history will be saved!",
    } as HistoryTab;
  };

  // 🌍 Render
  return (
    <Box>
      {tabs.length > 0 && (
        <Tabs
          aria-label="Goal tabs"
          value={currentTabIndex}
          onChange={(event, newValue) =>
            handleChange(event, newValue as number)
          }
          sx={{ borderRadius: "sm" }}
          className="-mx-4 -mt-4"
          color="primary"
          variant="plain"
        >
          <TabList className="m-0 p-0">
            {tabs.map((tab) => (
              <Tooltip key={tab.id} title={tab.tooltip ?? ""}>
                <HistoryTab
                  onSelect={() => setCurrentTabIndex(tab.index)}
                  count={tabs.length}
                  tab={tab}
                  currentTabIndex={currentTabIndex}
                />
              </Tooltip>
            ))}
            {tabs.length > 0 && (
              <Tooltip key={plusTab().id} title={plusTab().tooltip ?? ""}>
                <HistoryTab
                  count={tabs.length}
                  tab={plusTab()}
                  currentTabIndex={currentTabIndex}
                />
              </Tooltip>
            )}
          </TabList>
        </Tabs>
      )}

      <Box className="mx-2 mt-2 p-0">{children}</Box>
    </Box>
  );
};

export default HistoryTabber;
