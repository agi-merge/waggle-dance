// WaggleDanceDashboard.tsx
import List from "@mui/joy/List";
import Typography from "@mui/joy/Typography";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";

import { type GoalPlusExe } from "@acme/db";

import AddDocuments from "~/features/AddDocuments/AddDocuments";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import SkillSelect from "~/features/Skills/SkillSelect";
import useGoalStore from "~/stores/goalStore";

type WaggleDanceDashboardProps = {
  goal: GoalPlusExe; // replace with the proper type
  skillsLabel: string;
  selectedSkillsLength: number;
};

const WaggleDanceDashboard = ({
  goal,
  skillsLabel,
  selectedSkillsLength,
}: WaggleDanceDashboardProps) => {
  const { selectedGoal, duplicateGoal } = useGoalStore();
  return (
    <List
      type="single"
      collapsible={true}
      component={Accordion}
      color="neutral"
      className="mt-2"
      sx={{ padding: 0 }}
      defaultValue={"item-1"}
    >
      <Box sx={{ display: { xs: "block", md: "flex" } }}>
        <Box
          sx={{
            flex: 1,
            maxWidth: { xs: "100%", md: "100%" },
          }}
        >
          <AccordionItem value="item-1">
            <AccordionHeader
              isFirst
              defaultChecked={true}
              variant="outlined"
              color="neutral"
              openText={
                <Box height={"3rem"}>
                  <Typography noWrap level="title-sm">
                    🍯 Goal
                  </Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      opacity: 0,
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    {goal?.prompt}
                  </Typography>
                </Box>
              }
              closedText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">🍯 Goal</Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    {goal?.prompt}
                  </Typography>
                </Box>
              }
            />
            <AccordionContent isLast={false}>{goal?.prompt}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionHeader
              isFirst
              variant="outlined"
              color="neutral"
              openText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">🌺 Data</Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    Boost result quality ‼️ under active development
                  </Typography>
                </Box>
              }
              closedText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">🌺 Data</Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    Boost result quality ‼️ under active development
                  </Typography>
                </Box>
              }
            />
            <AccordionContent isLast={false}>
              <AddDocuments />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionHeader
              variant="outlined"
              color="neutral"
              isLast={true}
              openText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">
                    🔨 Skills ({selectedSkillsLength})
                  </Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    {skillsLabel}
                  </Typography>
                </Box>
              }
              closedText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">
                    🔨 Skills ({selectedSkillsLength})
                  </Typography>
                  <Typography
                    noWrap
                    level="body-sm"
                    sx={{
                      fontSize: { xs: "xs", sm: "sm" },
                    }}
                  >
                    {skillsLabel}
                  </Typography>
                </Box>
              }
            />
            <AccordionContent isLast={true}>
              <SkillSelect />
            </AccordionContent>
          </AccordionItem>
        </Box>
      </Box>
    </List>
  );
};

export default WaggleDanceDashboard;
