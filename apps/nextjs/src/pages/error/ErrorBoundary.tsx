// components/ErrorBoundary.tsx
import React, { type ErrorInfo, type ReactNode } from "react";
import { type NextRouter } from "next/router";
import { Refresh } from "@mui/icons-material";
import { Button, Divider, Link, Stack, Typography } from "@mui/joy";

import { env } from "~/env.mjs";

interface ErrorBoundaryProps {
  children: ReactNode;
  router: NextRouter;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Log or handle error here
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Stack className="content-center justify-center self-center  text-center align-middle">
          <Typography level="h3">
            A fatal error occurred.
            <Divider />
            <Typography level="title-lg">This is likely a bug.</Typography>
          </Typography>
          <Button
            onClick={() => this.props.router.reload()}
            aria-label="Reload"
            variant="plain"
          >
            <span className="max-w-fit">
              <Refresh></Refresh>Reload
            </span>
          </Button>{" "}
          <Stack
            direction="row"
            spacing={1}
            className="max-w-sm justify-center text-center  align-baseline"
          >
            <Typography className="self-center">Not working?</Typography>
            <Button
              onClick={() => this.props.router.reload()}
              aria-label="Reload"
              variant="plain"
            >
              Go home
            </Button>{" "}
            <Divider />
            <Button
              component={Link}
              href={env.NEXT_PUBLIC_DISCORD_INVITE_URL}
              aria-label="Get help on Discord"
              variant="plain"
            >
              Get Help
            </Button>
          </Stack>
        </Stack>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
