import { DarkMode, LightMode } from "@mui/icons-material";
import Switch from "@mui/joy/Switch";
import { useColorScheme } from "@mui/joy/styles";
import React from "react";

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  // necessary for server-side rendering
  // because mode is undefined on the server
  React.useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }

  return (
    <Switch
      checked={mode === "dark"}
      onChange={(event) => setMode(event.target.checked ? "dark" : "light")}
      onClick={() => {
        setMode(mode === "light" ? "dark" : "light");
      }}
      slotProps={{
        input: { "aria-label": "Dark mode" },
        thumb: {
          children: mode === "dark" ? <DarkMode /> : <LightMode />,
        },
      }}
      sx={{
        "--Switch-thumbSize": "28px",
      }}
    />
    // <Button
    //   variant="plain"
    //   onClick={() => {
    //     setMode(mode === "light" ? "dark" : "light");
    //   }}
    // >
    //   {mode === "light" ? "🌙" : "☀️"}
    // </Button>
  );
}
