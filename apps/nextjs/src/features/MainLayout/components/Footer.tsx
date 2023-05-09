import Link from "next/link";
import { useTheme } from "@emotion/react";
import { GitHub, LinkedIn } from "@mui/icons-material";
import {
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
  useColorScheme,
} from "@mui/joy";

const Footer = () => {
  const { mode } = useColorScheme();

  const color = mode === "dark" ? "text-white" : "text-black";
  return (
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
          <ListItemButton color="neutral">
            <Link href="https://discord.gg/Rud2fR3hAX" target="_blank">
              <img className="w-5" src={`./discord-when-${mode}.svg`} />
            </Link>
          </ListItemButton>
        </ListItem>
        <ListDivider inset="gutter" />
        <ListItem>
          <ListItemButton>
            <Link
              href="https://github.com/agi-merge/waggle-dance"
              target="_blank"
              className={color}
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
              className={color}
            >
              <LinkedIn />
            </Link>
          </ListItemButton>
        </ListItem>
        <ListDivider inset="gutter" />
        <ListItem>
          <ListItemButton>
            <Link
              href="https://www.patreon.com/agimerge"
              target="_blank"
              className={color}
            >
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
    </footer>
  );
};

export default Footer;
