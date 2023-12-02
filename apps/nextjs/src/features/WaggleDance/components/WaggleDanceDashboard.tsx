// WaggleDanceDashboard.tsx
import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Avatar,
  Box,
  ListItemContent,
} from "@mui/joy";
import Typography from "@mui/joy/Typography";

import type {GoalPlusExe} from "@acme/db";

import AddDocuments from "~/features/AddDocuments/AddDocuments";
import SkillSelect from "~/features/Skills/SkillSelect";

interface WaggleDanceDashboardProps {
  goal: GoalPlusExe; // replace with the proper type
  skillsLabel: string;
  selectedSkillsLength: number;
}

const WaggleDanceDashboard = ({
  goal,
  skillsLabel,
  selectedSkillsLength,
}: WaggleDanceDashboardProps) => {
  const [selectedIndex, setSelectedIndex] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
  });
  return (
    <AccordionGroup
      variant="outlined"
      sx={{ boxShadow: "lg", borderRadius: "md", overflow: "clip" }}
    >
      <Box sx={{ display: { xs: "block", md: "flex" } }}>
        <Box
          sx={{
            flex: 1,
            maxWidth: { xs: "100%", md: "100%" },
          }}
        >
          <Accordion
            sx={{
              overflow: "clip",
              boxShadow: "sm",
              borderTopLeftRadius: "md",
              borderTopRightRadius: "md",
            }}
            expanded={selectedIndex[0]}
            onChange={(_, expanded) => {
              setSelectedIndex({ ...selectedIndex, 0: expanded });
            }}
          >
            <AccordionSummary>
              <Avatar
                color="primary"
                variant="solid"
                sx={{ mixBlendMode: "luminance" }}
              >
                <Typography sx={{ mixBlendMode: "luminance" }} level="h2">
                  🍯
                </Typography>
              </Avatar>
              <ListItemContent>
                <Box
                  height={"3rem"}
                  sx={{ alignSelf: "start", alignContent: "" }}
                >
                  <Typography noWrap level="title-sm">
                    Goal
                  </Typography>
                  {!selectedIndex[0] && (
                    <Typography
                      noWrap
                      level="body-sm"
                      sx={{
                        fontSize: { xs: "xs", sm: "sm" },
                        width: "100%",
                      }}
                    >
                      {goal?.prompt}
                    </Typography>
                  )}
                </Box>
              </ListItemContent>
            </AccordionSummary>
            <AccordionDetails>{goal?.prompt}</AccordionDetails>
          </Accordion>
          <Accordion
            expanded={selectedIndex[1]}
            onChange={(_, expanded) => {
              setSelectedIndex({ ...selectedIndex, 1: expanded });
            }}
            sx={{
              overflow: "clip",
              boxShadow: "sm",
            }}
          >
            <AccordionSummary>
              <Avatar color="danger" variant="solid">
                <Typography sx={{ mixBlendMode: "luminance" }} level="h2">
                  🌺
                </Typography>
              </Avatar>
              <ListItemContent>
                <Box height={"3rem"}>
                  <Typography level="title-sm"> Data</Typography>
                  {!selectedIndex[1] && (
                    <Typography
                      noWrap
                      level="body-sm"
                      sx={{
                        fontSize: { xs: "xs", sm: "sm" },
                        width: "100%",
                      }}
                    >
                      Boost result quality
                    </Typography>
                  )}
                </Box>
              </ListItemContent>
            </AccordionSummary>
            <AccordionDetails>
              <AddDocuments />
            </AccordionDetails>
          </Accordion>
          <Accordion
            expanded={selectedIndex[2]}
            onChange={(_, expanded) => {
              setSelectedIndex({ ...selectedIndex, 2: expanded });
            }}
            sx={{
              overflow: "clip",
              borderBottomLeftRadius: "md",
              borderBottomRightRadius: "md",
            }}
          >
            <AccordionSummary>
              <Avatar color="neutral" variant="solid">
                {" "}
                <Typography sx={{ mixBlendMode: "luminance" }} level="h2">
                  🔨
                </Typography>
              </Avatar>
              <ListItemContent>
                <Box
                  height={"3rem"}
                  sx={{ alignSelf: "start", alignContent: "" }}
                >
                  <Typography level="title-sm">
                    Skills ({selectedSkillsLength})
                  </Typography>
                  {!selectedIndex[2] && (
                    <Typography
                      noWrap
                      level="body-sm"
                      sx={{
                        fontSize: { xs: "xs", sm: "sm" },
                        width: "100%",
                      }}
                    >
                      {skillsLabel}
                    </Typography>
                  )}
                </Box>
              </ListItemContent>
            </AccordionSummary>
            <AccordionDetails>
              <SkillSelect />
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </AccordionGroup>
  );
};

export default WaggleDanceDashboard;
