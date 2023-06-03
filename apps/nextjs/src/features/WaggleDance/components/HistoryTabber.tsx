import { useEffect, useState } from "react";
import { Tab, TabList, Tabs, Tooltip } from "@mui/joy";

export interface HistoryTab {
  index: number;
  label: string;
  handler?: () => void;
  tooltip?: string;
  selectedByDefault?: boolean;
}

interface HistoryTabProps {
  tab: HistoryTab;
  currentTabIndex: number;
}

interface HistoryTabberProps {
  tabs: HistoryTab[];
}

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({ tab, currentTabIndex }) => {
  return (
    <Tab
      key={tab.index}
      variant={currentTabIndex === tab.index ? "soft" : "plain"}
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
    >
      {tab.label}
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
  }, []);

  // Handle tab change
  const handleChange = (
    _event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    // Update tab state
    setCurrentTabIndex(newValue);

    // Run the handler if it exists
    const thisTab = tabs?.[newValue];
    if (thisTab?.handler) thisTab.handler();
  };

  // 🌍 Render
  return (
    <Tabs
      aria-label="Disabled tabs"
      value={currentTabIndex}
      onChange={(event, newValue) => handleChange(event, newValue as number)}
      sx={{ borderRadius: "lg" }}
    >
      <TabList>
        {tabs.map((tab) => (
          <Tooltip placement="right" key={tab.index} title={tab.tooltip ?? ""}>
            <div>
              <HistoryTab tab={tab} currentTabIndex={currentTabIndex} />
            </div>
          </Tooltip>
        ))}
      </TabList>
    </Tabs>
  );
};

export default HistoryTabber;
