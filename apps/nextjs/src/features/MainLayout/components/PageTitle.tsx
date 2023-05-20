import { useState } from "react";
import { Divider, Stack, Typography } from "@mui/joy";

import GoalMenu from "~/features/GoalMenu";

interface TitleProps {
  title: string;
  description: string;
  hideGoal?: boolean;
}
// Used at the top of pages
const PageTitle = ({ title, description, hideGoal }: TitleProps) => {
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
        direction={{ xs: "column", sm: "row" }}
        className="flex"
        gap="1rem"
      >
        <Stack direction="column">
          <Typography level="h4">{title}</Typography>
          {headerExpanded && (
            <Typography
              level="body3"
              sx={{
                userSelect: "none",
                marginBottom: { xs: hideGoal ? 0 : -3, sm: 0 },
              }}
              className="max-w-md"
            >
              {description}
            </Typography>
          )}
        </Stack>

        {!hideGoal && <GoalMenu />}
      </Stack>
      <Divider inset="context">
        <Typography className="w-52 text-center" level="body3">
          ~
        </Typography>
      </Divider>
    </Stack>
  );
};

export default PageTitle;
