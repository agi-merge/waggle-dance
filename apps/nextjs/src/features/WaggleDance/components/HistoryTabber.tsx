import { useEffect, useState } from "react";
import { Close } from "@mui/icons-material";
import {
  Divider,
  IconButton,
  Stack,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  Typography,
  type TabsProps,
} from "@mui/joy";

export interface HistoryTab {
  index: number;
  label: string;
  handler?: () => void;
  closeHandler?: () => void;
  tooltip?: string;
  selectedByDefault?: boolean;
}

interface HistoryTabProps {
  count: number;
  tab: HistoryTab;
  currentTabIndex: number;
}

interface HistoryTabberProps extends TabsProps {
  tabs: HistoryTab[];
  children: React.ReactNode;
}

// Constants
const maxTabLabelLength = 20;

// Util function to limit the number of characters in a string and add ...
const truncate = (str: string, n: number) => {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
};

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({
  count,
  tab,
  currentTabIndex,
}) => {
  return (
    <Tab
      key={tab.label}
      className="text-overflow-ellipsis m-0 overflow-hidden p-0"
      variant="outlined"
      sx={{ background: "black" }}
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
      onClick={tab.handler}
    >
      {tab.index !== count - 1 ? (
        <>
          <IconButton
            size="sm"
            color="neutral"
            variant="plain"
            onClick={tab.closeHandler}
          >
            <Close />
          </IconButton>
          <Typography className="pl-2">
            {truncate(tab.label, maxTabLabelLength)}
          </Typography>
        </>
      ) : (
        <Typography className="">
          {truncate(tab.label, maxTabLabelLength)}
        </Typography>
      )}
    </Tab>
  );
};

// The main tabber component
const HistoryTabber: React.FC<HistoryTabberProps> = ({ tabs }) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);

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
    const thisTab = tabs?.[newValue];
    if (newValue === tabs.length - 1) {
      event?.preventDefault();
      if (thisTab?.handler) thisTab.handler();
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);

    // Run the handler if it exists
    if (thisTab?.handler) thisTab.handler();
  };

  // 🌍 Render
  return (
    <Tabs
      aria-label="Goal tabs"
      value={currentTabIndex}
      onChange={(event, newValue) => handleChange(event, newValue as number)}
      sx={{ borderRadius: "sm", background: "transparent" }}
      className="-mx-10 -mt-9 p-0"
      color="primary"
    >
      <TabList className="m-0 p-0" sx={{ background: "transparent" }}>
        {tabs.map((tab) => (
          <Tooltip placement="right" key={tab.index} title={tab.tooltip ?? ""}>
            <HistoryTab
              count={tabs.length}
              tab={tab}
              currentTabIndex={currentTabIndex}
            />
          </Tooltip>
        ))}
      </TabList>
      <Divider className="-mt-4" />
    </Tabs>
  );
};

export default HistoryTabber;
