import { useEffect, useState } from "react";
import { Tab, TabList, Tabs } from "@mui/joy";

export interface HistoryTab {
  index: number;
  label: string;
  handler?: () => void;
  selectedByDefault?: boolean;
}

interface HistoryTabberProps {
  tabs: HistoryTab[];
}

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
        {/* Tab styles - @see: https://mui.com/joy-ui/react-tabs/ */}
        {tabs.map((tab) => (
          <Tab
            key={tab.index}
            variant={currentTabIndex === tab.index ? "soft" : "plain"}
            color={currentTabIndex === tab.index ? "primary" : "neutral"}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
};

export default HistoryTabber;
