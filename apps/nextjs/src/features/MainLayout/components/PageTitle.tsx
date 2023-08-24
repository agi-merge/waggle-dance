import { type ReactNode } from "react";
import { type StackProps } from "@mui/joy";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

interface TitleProps extends StackProps {
  title: string;
  children?: ReactNode | null;
}
// Used at the top of pages
const PageTitle = ({ title, children }: TitleProps) => {
  return (
    <Stack className="flex flex-grow">
      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        className="flex"
        gap="1rem"
      >
        <Stack direction="column" className="flex w-full" gap="0.5rem">
          <Typography level="h4" fontSize={{ xs: "14pt", sm: "18pt" }}>
            {title}
          </Typography>
          {children}
        </Stack>
      </Stack>
      {children && <Box sx={{ marginTop: { xs: 1, sm: 2 } }} />}
      <Divider inset="context">
        <Typography className="w-1/2 text-center" level="body-md">
          ~
        </Typography>
      </Divider>
    </Stack>
  );
};

export default PageTitle;
