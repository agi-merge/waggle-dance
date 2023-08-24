import { AutoFixHigh, AutoFixOff } from "@mui/icons-material";
import {
  Checkbox,
  checkboxClasses,
  Sheet,
  Typography,
  type SheetProps,
} from "@mui/joy";

import useApp from "~/stores/appStore";

type Props = SheetProps;

export default function AutoRefineGoalToggle({}: Props) {
  const { isAutoRefineEnabled, setIsAutoRefineEnabled } = useApp();
  return (
    <Sheet
      variant={"outlined"}
      color="warning"
      className="m-0 px-1 pt-2"
      sx={{
        marginLeft: -0.4,
        borderRadius: isAutoRefineEnabled ? 2 : 1,
        borderColor: isAutoRefineEnabled ? "warning" : "transparent",
      }}
    >
      <Checkbox
        color="warning"
        variant="plain"
        uncheckedIcon={<AutoFixOff />}
        checkedIcon={<AutoFixHigh />}
        checked={isAutoRefineEnabled}
        onChange={(e) => setIsAutoRefineEnabled(e.target.checked)}
        label={
          <Typography
            level="body-sm"
            color="warning"
            sx={{ opacity: isAutoRefineEnabled ? 1 : 0.5 }}
          >
            Auto-Refine
          </Typography>
        }
        sx={{ padding: 0 }}
        slotProps={{
          action: {
            className: isAutoRefineEnabled
              ? checkboxClasses.checked
              : checkboxClasses.variantOutlined,
          },
        }}
      />
    </Sheet>
  );
}
