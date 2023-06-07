import { useEffect, useState } from "react";
import { Close } from "@mui/icons-material";
import {
  Divider,
  IconButton,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  Typography,
  type TabsProps,
} from "@mui/joy";
import { v4 } from "uuid";

import { api } from "~/utils/api";
import useHistory from "~/stores/historyStore";

export interface HistoryTab {
  id: string;
  index: number;
  label: string;
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
  const del = api.goal.delete.useMutation();
  const closeHandler = async (tab: HistoryTab) => {
    await del.mutateAsync(tab.id);
  };

  return (
    <Tab
      key={tab.label}
      className="text-overflow-ellipsis m-0 overflow-hidden p-0"
      variant="outlined"
      sx={{ background: "black" }}
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
      onClick={tab.handler}
    >
      {tab.closeHandler ? (
        <>
          <IconButton
            size="sm"
            color="neutral"
            variant="plain"
            onClick={() => closeHandler(tab)}
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
const HistoryTabber: React.FC<HistoryTabberProps> = ({ tabs, children }) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const { setHistoryData } = useHistory();
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
      return;
    }
    // Update tab state
    setCurrentTabIndex(newValue);
  };

  const plusTab = () => {
    return {
      id: v4(),
      index: tabs.length,
      label: "+",
      tooltip: "🐝 Start wagglin' and your history will be saved!",
      // handler: () => {
      //   const plus = tabs.pop();
      //   const index = tabs.length;
      //   tabs.push({
      //     index,
      //     label: "New Tab",
      //     closeHandler: () => {
      //       // console.log("close", goal);
      //       tabs.splice(index, 1);
      //     },
      //   });
      //   plus && tabs.push(plus);
      //   setHistoryData({
      //     tabs,
      //   });
    } as HistoryTab;
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
          <Tooltip placement="right" key={tab.id} title={tab.tooltip ?? ""}>
            <HistoryTab
              count={tabs.length}
              tab={tab}
              currentTabIndex={currentTabIndex}
            />
          </Tooltip>
        ))}
        <Tooltip
          placement="right"
          key={plusTab().id}
          title={plusTab().tooltip ?? ""}
        >
          <HistoryTab
            count={tabs.length}
            tab={plusTab()}
            currentTabIndex={currentTabIndex}
          />
        </Tooltip>
      </TabList>
      <Divider className="-mt-4" />
      {children}
    </Tabs>
  );
};

export default HistoryTabber;
