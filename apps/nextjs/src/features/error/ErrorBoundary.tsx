// components/ErrorBoundary.tsx
import React, { type ErrorInfo, type ReactNode } from "react";
import { type NextRouter } from "next/router";
import { Box, Button, Divider, Stack, Typography } from "@mui/joy";
import { track } from "@vercel/analytics";

interface ErrorBoundaryProps {
  children: ReactNode;
  router: NextRouter;
}

interface ErrorBoundaryState {
  error: Error | null | undefined;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error: error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log or handle error here
    const props: Record<string, string | number | boolean | null> = {
      message: error.message,
      name: error.name,
      stack: error.stack || null,
      componentStack: info.componentStack || null,
    };
    track("error", props);
  }

  render(): ReactNode {
    if (!!this.state.error) {
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
const ErrorDisplay = ({ error }: { error: Error }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="left"
    justifyContent="left"
    sx={{ p: 5, maxWidth: "100%" }}
  >
    <Typography level="h3" sx={{ textAlign: "left" }}>
      An unexpected error has occurred.
    </Typography>
    <Typography
      level="body-sm"
      fontFamily="monospace"
      sx={{ textAlign: "start", overflowWrap: "break-word" }}
    >
      {error.name}:{" "}
      <Typography level="body-sm" fontFamily="monospace">
        {error.message}
      </Typography>
    </Typography>
    <Divider sx={{ mt: 2 }} />
    <Stack direction="row" gap="0.5rem" sx={{ pt: 5 }}>
      <Button onClick={() => window.location.reload()} variant="soft">
        Reload
      </Button>
      <Button
        onClick={() => window.sessionStorage.clear()}
        variant="soft"
        color="danger"
      >
        Clear local data
      </Button>
    </Stack>
    {/* Add more user options here */}
  </Box>
);
