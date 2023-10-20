import { Checkbox, List, type CheckboxProps } from "@mui/joy";
import Typography from "@mui/joy/Typography";
import { Accordion, AccordionItem } from "@radix-ui/react-accordion";
import { v4 } from "uuid";

import { type Skillset } from "@acme/db";
import { skillDatabase } from "@acme/db/skills";

import theme from "~/styles/theme";
import useSkillStore from "~/stores/skillStore";
import Alerts from "../Alerts/Alerts";
import { AccordionContent, AccordionHeader } from "../HeadlessUI/JoyAccordion";

const SkillSelect = ({}) => {
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
    <List
      type="multiple"
      variant="plain"
      component={Accordion}
      value={selectedSkills.map((skill) => skill?.id ?? "")}
    >
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
      {skillDatabase.map((skill, i) => (
        <AccordionItem value={skill.id} key={skill.id} className="pb-5">
          <AccordionHeader
            isFirst={skill.index === 0 || i === 0}
            variant="outlined"
            openText={<CheckboxItem skill={skill} />}
            closedText={<CheckboxItem skill={skill} />}
          />
          <AccordionContent
            isLast={
              skill.index === skillDatabase.length - 1 ||
              i === skillDatabase.length
            }
          >
            <Typography level="body-xs" fontFamily="monospace">
              This is where config would go for {skill.label}
            </Typography>
          </AccordionContent>
        </AccordionItem>
      ))}
    </List>
  );
};

export default SkillSelect;
