import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import {
  Close,
  GitHub,
  LinkedIn,
  Money,
  MoneyTwoTone,
  Warning,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  IconButton,
  Link,
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  Sheet,
  Stack,
  Typography,
  useColorScheme,
} from "@mui/joy";

import { app } from "~/constants";
import { useAppContext } from "~/pages/_app";
import Header from "./components/Header";
import PageLoading from "./components/PageLoading";

const MainLayout = ({ children }) => {
  const { mode } = useColorScheme();
  const { goal } = useAppContext();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [systemAlertOpen, setSystemAlertOpen] = useState(true);

  // necessary for server-side renderingπ
  // because mode is undefined on the server
  useEffect(() => {
    setMounted(true);
  }, [goal, router]);
  if (!mounted) {
    return null;
  }

  // useEffect(() => {}, [goal, router]);
  const color = "warning";
  const title = "Limited Demo";
  const description = "Core features are broken and are frequently changing.";
  const icon = <Warning />;
  return (
    <div className={`bg-honeycomb ${mode === "dark" ? " dark" : "light"}`}>
      <div className="h-screen px-0 py-4">
        <Head>
          <title>{app.name}</title>
          <meta name="description" content={app.description} />
          <meta
            name="viewport"
            content="initial-scale=1, width=device-width; viewport-fit=cover"
          />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Sheet
          // variant="outlined"
          className="full w-xl h-[min(full, 100vh)] mx-auto max-w-xl items-center p-5"
          sx={{
            borderRadius: "lg",
            shadowRadius: "xl",
          }}
          invertedColors
        >
          <Header />
          <PageLoading />
          {systemAlertOpen && (
            <Box
              className="my-2"
              sx={{
                display: "flex",
                gap: 2,
                width: "100%",
                flexDirection: "column",
              }}
            >
              <Alert
                key={title}
                sx={{ alignItems: "flex-start" }}
                startDecorator={React.cloneElement(icon, {
                  sx: { mt: "2px", mx: "4px" },
                  fontSize: "xl2",
                })}
                variant="soft"
                color={color}
                endDecorator={
                  <IconButton
                    variant="soft"
                    size="sm"
                    color={color}
                    onClick={() => {
                      setSystemAlertOpen(false);
                    }}
                  >
                    <Close />
                  </IconButton>
                }
              >
                <div>
                  <Typography fontWeight="lg" mt={0.25}>
                    {title}
                  </Typography>
                  <Typography fontSize="sm" sx={{ opacity: 0.8 }}>
                    {description}
                  </Typography>
                </div>
              </Alert>
            </Box>
          )}
          <Card className="w-full">{children}</Card>
          <footer className="sticky-footer flex w-full pb-2 pt-10">
            {/* <Sheet className="w-full">
            <Card> */}
            <List
              orientation="horizontal"
              sx={{
                bgcolor: "background.body",
                borderRadius: "sm",
                boxShadow: "sm",
                flexGrow: 0,
                mx: "auto",
                "--ListItemDecorator-size": "48px",
                "--ListItem-paddingY": "1rem",
              }}
            >
              <ListItem>
                <ListItemButton>
                  <Link href="https://discord.gg/Rud2fR3hAX" target="_blank">
                    <img className="w-5" src={`discord-when-${mode}.svg`} />
                  </Link>
                </ListItemButton>
              </ListItem>
              <ListDivider inset="gutter" />
              <ListItem>
                <ListItemButton>
                  <Link
                    href="https://github.com/agi-merge/waggle-dance"
                    target="_blank"
                  >
                    <GitHub />
                  </Link>
                </ListItemButton>
              </ListItem>
              <ListDivider inset="gutter" />
              <ListItem>
                <ListItemButton>
                  <Link
                    href="https://linkedin.com/in/willisjon"
                    target="_blank"
                  >
                    <LinkedIn />
                  </Link>
                </ListItemButton>
              </ListItem>
              <ListDivider inset="gutter" />
              <ListItem>
                <ListItemButton>
                  <Link href="https://www.patreon.com/agimerge" target="_blank">
                    <img className="w-5" src={`patreon.svg`} />
                  </Link>
                </ListItemButton>
              </ListItem>
              <ListDivider inset="gutter" />
              <ListItem>
                <Stack className="items-center">
                  <Typography level="body5">
                    © 2023 <Link href="https://agimerge.com">agi-merge</Link>
                  </Typography>
                  <Typography level="body5">
                    <Link href="/privacy">privacy</Link> |{" "}
                    <Link href="/terms">terms</Link>
                  </Typography>
                </Stack>
              </ListItem>
            </List>
            {/* </Card>
            <Card></Card> */}
            {/* </Sheet> */}
          </footer>
        </Sheet>
      </div>
    </div>
  );
};

export default MainLayout;
