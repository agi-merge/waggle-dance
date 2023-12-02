import type { CheckboxProps } from "@mui/joy";
import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Checkbox,
} from "@mui/joy";
import Typography from "@mui/joy/Typography";
import { v4 } from "uuid";

import type { Skillset } from "@acme/db";
import { skillDatabase } from "@acme/db/skills";

import useSkillStore from "~/stores/skillStore";
import theme from "~/styles/theme";
import Alerts from "../Alerts/Alerts";

const SkillSelect = () => {
  const { selectedSkills, toggleSkill } = useSkillStore();
  const handleCheckboxChange = (skill: Skillset) => {
    toggleSkill(skill);
  };

  const CheckboxItem = ({
    skill,
    ...props
  }: { skill: Skillset } & CheckboxProps) => {
    return (
      <Checkbox
        size="lg"
        label={
          <>
            <Typography level="title-sm" sx={{}}>
              {skill.label}
            </Typography>
            <br />
            <Typography level="body-sm">{skill.description}</Typography>
          </>
        }
        color="primary"
        checked={selectedSkills[skill.index]?.id === skill.id}
        variant="outlined"
        overlay
        onChange={() => {
          handleCheckboxChange(skill);
        }}
        slotProps={{
          checkbox: {
            sx: { marginY: "auto" },
          },
          action: {
            sx: {
              borderRadius: "1pt",
              borderColor: theme.palette.primary[500],
            },
          },
        }}
        {...props}
      />
    );
  };

  return (
    <AccordionGroup>
      <Alerts
        alertConfigs={[
          {
            id: v4(),
            title: "",
            description:
              "These settings are under construction and do not have any effect yet. The skills that are selected by default ARE enabled in the demo. Please check back later.",
            color: "warning",
            footer: "",
          },
        ]}
      />
      {skillDatabase.map((skill) => (
        <Accordion key={skill.id} className="pb-5">
          <AccordionSummary>
            <CheckboxItem skill={skill} />
          </AccordionSummary>
          <AccordionDetails>
            <Typography level="body-xs" fontFamily="monospace">
              This is where config would go for {skill.label}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </AccordionGroup>
  );
};

export default SkillSelect;
