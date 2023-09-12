// WaggleDanceSettingsAccordion.tsx
import { QuestionMarkOutlined } from "@mui/icons-material";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  type AlertPropsColorOverrides,
  type ColorPaletteProp,
} from "@mui/joy";
import List from "@mui/joy/List";
import Typography from "@mui/joy/Typography";
import { type OverridableStringUnion } from "@mui/types";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";

import { type GoalPlusExe } from "@acme/db";

import AddDocuments from "~/features/AddDocuments/AddDocuments";
import AgentSettings from "~/features/AgentSettings/AgentSettings";
import {
  AccordionContent,
  AccordionHeader,
} from "~/features/HeadlessUI/JoyAccordion";
import { type LatencyScaleItem } from "~/features/SettingsAnalysis/hooks/useLatencyEstimate";
import { Latency } from "~/features/SettingsAnalysis/Latency";
import SkillSelect from "~/features/Skills/SkillSelect";

type WaggleDanceSettingsAccordionProps = {
  goal: GoalPlusExe; // replace with the proper type
  latencyLevel: LatencyScaleItem; // replace with the proper type
  rigorLevel: {
    limit: number;
    color: OverridableStringUnion<ColorPaletteProp, AlertPropsColorOverrides>;
    label: string;
    description: string;
  };
  iqLevel: LatencyScaleItem;
  skillsLabel: string;
  selectedSkillsLength: number;
};

const WaggleDanceSettingsAccordion = ({
  goal,
  latencyLevel,
  rigorLevel,
  iqLevel,
  skillsLabel,
  selectedSkillsLength,
}: WaggleDanceSettingsAccordionProps) => {
  return (
    <List
      type="multiple"
      component={Accordion}
      color="neutral"
      className="mt-2"
      sx={{ padding: 0 }}
    >
      <Box sx={{ display: { xs: "block", md: "flex" } }}>
        <Box
          sx={{
            flex: 1,
            maxWidth: { xs: "100%", md: "50%" },
          }}
        >
          <AccordionItem value="item-1">
            <AccordionHeader
              isFirst
              variant="outlined"
              color="primary"
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
          <AccordionItem value="item-2">
            <AccordionHeader
              isLast={true}
              variant="outlined"
              color="primary"
              openText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">📊 Settings</Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                    }}
                    component={Stack}
                    direction="row"
                    gap={1}
                  >
                    <Latency latencyLevel={latencyLevel} />
                    {" · "}
                    <Tooltip
                      title={`(Higher is better) ${rigorLevel.description}`}
                    >
                      <Typography
                        flexWrap={"wrap"}
                        level="body-sm"
                        color="neutral"
                        sx={{
                          fontSize: { xs: "xs", sm: "sm" },
                        }}
                      >
                        Rigor:{" "}
                        <Typography color={rigorLevel.color}>
                          {rigorLevel.label}
                        </Typography>
                      </Typography>
                    </Tooltip>
                    {" · "}

                    <Tooltip
                      title={`(Higher is better) ${iqLevel.description}`}
                    >
                      <Typography
                        flexWrap={"wrap"}
                        level="body-sm"
                        color="neutral"
                        sx={{
                          fontSize: { xs: "xs", sm: "sm" },
                        }}
                      >
                        IQ:{" "}
                        <Typography color={iqLevel.color} className="align-end">
                          {iqLevel.label}
                        </Typography>
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>
              }
              closedText={
                <Box height={"3rem"}>
                  <Typography level="title-sm">📊 Settings</Typography>
                  <Box
                    sx={{ display: "flex", alignItems: "center" }}
                    component={Stack}
                    direction="row"
                    gap={1}
                  >
                    <Tooltip
                      title={`(Lower is better) ${latencyLevel.description}`}
                    >
                      <Typography
                        noWrap
                        level="body-sm"
                        color="neutral"
                        sx={{
                          fontSize: { xs: "xs", sm: "sm" },
                        }}
                      >
                        Latency:{" "}
                        <Typography color={latencyLevel.color}>
                          {latencyLevel.label}{" "}
                        </Typography>
                      </Typography>
                    </Tooltip>
                    {" · "}

                    <Tooltip
                      title={`(Higher is better) ${rigorLevel.description}`}
                    >
                      <Typography
                        flexWrap={"wrap"}
                        level="body-sm"
                        color="neutral"
                        sx={{
                          fontSize: { xs: "xs", sm: "sm" },
                        }}
                      >
                        Rigor:{" "}
                        <Typography color={rigorLevel.color}>
                          {rigorLevel.label}
                        </Typography>
                      </Typography>
                    </Tooltip>
                    {" · "}

                    <Tooltip
                      title={`(Higher is better) ${iqLevel.description}`}
                    >
                      <Typography
                        flexWrap={"wrap"}
                        level="body-sm"
                        color="neutral"
                        sx={{
                          fontSize: { xs: "xs", sm: "sm" },
                        }}
                      >
                        IQ:{" "}
                        <Typography color={iqLevel.color}>
                          {iqLevel.label}
                        </Typography>
                      </Typography>
                    </Tooltip>
                  </Box>
                </Box>
              }
            />
            <AccordionContent isLast={true} defaultChecked={true}>
              <AgentSettings />
              <Tooltip
                title={`(Lower is better) ${latencyLevel.description}`}
                sx={{ cursor: "pointer" }}
              >
                <Typography noWrap level="title-sm" color="neutral">
                  Latency:{" "}
                  <Typography color={latencyLevel.color} level="body-sm">
                    {latencyLevel.label}
                  </Typography>{" "}
                  <IconButton
                    color={latencyLevel.color}
                    variant="outlined"
                    size="sm"
                    sx={{ p: 0, m: 0, borderRadius: "50%" }}
                  >
                    <QuestionMarkOutlined
                      sx={{
                        fontSize: "8pt",
                        p: 0,
                        m: "auto",
                        minWidth: 20,
                      }}
                    />
                  </IconButton>
                </Typography>
              </Tooltip>

              <Tooltip
                title={`(Higher is better) ${rigorLevel.description}`}
                sx={{ cursor: "pointer" }}
              >
                <Typography flexWrap={"wrap"} level="title-sm" color="neutral">
                  Rigor:{" "}
                  <Typography color={rigorLevel.color} level="title-sm">
                    {rigorLevel.label}
                  </Typography>{" "}
                  <IconButton
                    color={rigorLevel.color}
                    variant="outlined"
                    size="sm"
                    sx={{ p: 0, m: 0, borderRadius: "50%" }}
                  >
                    <QuestionMarkOutlined
                      sx={{
                        fontSize: "8pt",
                        p: 0,
                        m: "auto",
                        minWidth: 20,
                      }}
                    />
                  </IconButton>
                </Typography>
              </Tooltip>

              <Tooltip
                title={`(Higher is better) ${iqLevel.description}`}
                sx={{ cursor: "pointer" }}
              >
                <Typography flexWrap={"wrap"} level="title-sm" color="neutral">
                  IQ:{" "}
                  <Typography color={iqLevel.color} level="title-sm">
                    {iqLevel.label}
                  </Typography>{" "}
                  <IconButton
                    color={iqLevel.color}
                    variant="outlined"
                    size="sm"
                    sx={{ p: 0, m: 0, borderRadius: "50%" }}
                  >
                    <QuestionMarkOutlined
                      sx={{
                        fontSize: "8pt",
                        p: 0,
                        m: "auto",
                        minWidth: 20,
                      }}
                    />
                  </IconButton>
                </Typography>
              </Tooltip>
            </AccordionContent>
          </AccordionItem>
        </Box>
        <Box
          sx={{
            flex: 1,
            maxWidth: { xs: "100%", md: "50%" },
          }}
        >
          <AccordionItem value="item-3">
            <AccordionHeader
              isFirst
              variant="outlined"
              color="primary"
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
                    xxx documents in yyy collections
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
                    xxx documents in yyy collections
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
              color="primary"
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

export default WaggleDanceSettingsAccordion;
