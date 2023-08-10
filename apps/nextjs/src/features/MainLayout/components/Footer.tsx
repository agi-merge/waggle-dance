import Link from "next/link";
import { GitHub, LinkedIn } from "@mui/icons-material";
import {
  List,
  ListDivider,
  ListItem,
  ListItemButton,
  Stack,
  SvgIcon,
  Typography,
} from "@mui/joy";

import { env } from "~/env.mjs";

const Footer = (
  props: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  >,
) => {
  return (
    <footer {...props}>
      <List
        orientation="horizontal"
        size="sm"
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
            {env.NEXT_PUBLIC_DISCORD_INVITE_URL && (
              <Link
                color="neutral"
                href={env.NEXT_PUBLIC_DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SvgIcon color="neutral" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                </SvgIcon>
              </Link>
            )}
          </ListItemButton>
        </ListItem>
        <ListDivider inset="gutter" />
        <ListItem>
          <ListItemButton color="neutral">
            <Link
              href="https://github.com/agi-merge/waggle-dance"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHub />
            </Link>
          </ListItemButton>
        </ListItem>
        <ListDivider inset="gutter" />
        <ListItem>
          <ListItemButton color="neutral">
            <Link href="https://linkedin.com/in/willisjon" target="_blank">
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
              rel="noopener noreferrer"
              color="neutral"
            >
              <SvgIcon color="neutral" viewBox="0 0 48 48">
                <rect width="6" height="32" x="8" y="8"></rect>
                <circle cx="30" cy="20" r="12"></circle>
              </SvgIcon>
            </Link>
          </ListItemButton>
        </ListItem>
        <ListDivider inset="gutter" />
        <ListItem>
          <Stack className="items-center">
            <Typography level="body-xs">
              © 2023 <Link href="https://agimerge.com">agi-merge</Link>
            </Typography>
            <Typography level="body-xs">
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
