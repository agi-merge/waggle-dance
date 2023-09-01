import { AutoFixHigh, AutoFixOff } from "@mui/icons-material";
import {
  Checkbox,
  checkboxClasses,
  Sheet,
  Tooltip,
  Typography,
  type SheetProps,
} from "@mui/joy";

import useApp from "~/stores/appStore";

type Props = SheetProps;

export default function AutoRefineGoalToggle({ ...props }: Props) {
  const { isAutoRefineEnabled, setIsAutoRefineEnabled } = useApp();
  return (
    <Tooltip
      title="Collaborate with AI to achieve your goal more effectively"
      color="warning"
    >
      <Sheet
        {...props}
        variant={"outlined"}
        color="warning"
        className="m-0 px-1 pt-1"
        sx={{
          marginLeft: -0.4,
          borderRadius: isAutoRefineEnabled ? 2 : 1,
          borderColor: isAutoRefineEnabled ? "warning" : "transparent",
        }}
      >
        <Checkbox
          color="warning"
          variant="plain"
          component={Typography}
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
            label: {
              sx: { marginInlineStart: 0.5 },
            },
          }}
        />
      </Sheet>
    </Tooltip>
  );
}
