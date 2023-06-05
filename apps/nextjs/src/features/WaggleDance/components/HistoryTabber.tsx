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

// Constants
const MAX_TAB_LABEL_LENGTH = 20;

// Util function to limit the number of characters in a string and add ...
const truncate = (str: string, n: number) => {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
};

// A single history tab inside the main tabber
const HistoryTab: React.FC<HistoryTabProps> = ({ tab, currentTabIndex }) => {
  return (
    <Tab
      key={tab.index}
      variant={currentTabIndex === tab.index ? "soft" : "plain"}
      color={currentTabIndex === tab.index ? "primary" : "neutral"}
    >
      {truncate(tab.label, MAX_TAB_LABEL_LENGTH)}
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
    _event: React.SyntheticEvent | null,
    newValue: number,
  ) => {
    // Update tab state
    setCurrentTabIndex(newValue);

    // Run the handler if it exists
    const thisTab = tabs?.[newValue];
    if (thisTab?.handler) thisTab.handler();
  };

  // Functions to handle "<" and ">" clicks
  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setCurrentTabIndex(currentTabIndex - 1);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setCurrentTabIndex(currentTabIndex + 1);
    }
  };

  // 🌍 Render
  return (
    <>
      {/* TODO: started out thinking tabber was the way, MUI core has built in slider
      but MUI joy does not so I hacked this in for now...  Feel like probs 
      sidebar is mo betah now though 🥲 */}
      {/* Paginate left */}
      <div className="flex items-center justify-center">
        <button onClick={handlePrevTab}>&lt;</button>
      </div>

      {/* Tabs */}
      <div>
        <Tabs
          aria-label="Disabled tabs"
          value={currentTabIndex}
          onChange={(event, newValue) =>
            handleChange(event, newValue as number)
          }
          sx={{ borderRadius: "lg" }}
        >
          <TabList>
            {tabs.map((tab) => (
              <Tooltip
                placement="right"
                key={tab.index}
                title={tab.tooltip ?? ""}
              >
                <div>
                  <HistoryTab tab={tab} currentTabIndex={currentTabIndex} />
                </div>
              </Tooltip>
            ))}
          </TabList>
        </Tabs>
      </div>

      {/* Paginate right */}
      <div className="flex items-center justify-center">
        <button onClick={handleNextTab}>&gt;</button>
      </div>
    </>
  );
};

export default HistoryTabber;
