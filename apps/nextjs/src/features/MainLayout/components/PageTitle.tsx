import { useState } from "react";
import { Box, Divider, Stack, Typography } from "@mui/joy";

interface TitleProps {
  title: string;
  description: string;
}
// Used at the top of pages
const PageTitle = ({ title, description }: TitleProps) => {
  const [headerExpanded, _setHeaderExpanded] = useState(true);

  return (
    <Stack
      className="flex flex-grow"
      onClick={(e) => {
        e.preventDefault();
        //_setHeaderExpanded(!headerExpanded);
      }}
    >
      <Stack
        direction={{ xs: "column-reverse", sm: "row" }}
        className="flex"
        gap="1rem"
      >
        <Stack direction="column" className="flex w-full">
          <Typography level="h4">{title}</Typography>
          {headerExpanded && (
            <Typography
              level="body2"
              sx={{
                userSelect: "none",
                marginBottom: { xs: -1, sm: 0 },
              }}
            >
              {description}
            </Typography>
          )}
        </Stack>
      </Stack>
      <Box sx={{ marginTop: { xs: 1, sm: 2 } }} />
      <Divider inset="context">
        <Typography className="w-1/2 text-center" level="body3">
          ~
        </Typography>
      </Divider>
    </Stack>
  );
};

export default PageTitle;
