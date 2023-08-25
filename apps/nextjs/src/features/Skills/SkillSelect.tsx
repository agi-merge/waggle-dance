import { Settings } from "@mui/icons-material";
import {
  Checkbox,
  IconButton,
  List,
  ListDivider,
  ListItem,
  ListItemContent,
  ListItemDecorator,
} from "@mui/joy";
import Typography from "@mui/joy/Typography";

import useSkillStore, {
  skillDatabase,
  type SkillDisplay,
} from "~/stores/skillStore";

const SkillSelect = ({}) => {
  const { selectedSkills, toggleSkill } = useSkillStore();

  const handleCheckboxChange = (skill: SkillDisplay) => {
    toggleSkill(skill);
  };

  return (
    <List variant="plain" sx={{ padding: 1, margin: 1, marginLeft: -2 }}>
      {skillDatabase.map((skill) => (
        <>
          <ListItem
            sx={{ paddingX: 1, margin: 0, paddingY: 0.25 }}
            key={skill.id}
          >
            <ListItemContent>
              <Checkbox
                size="lg"
                label={
                  <>
                    <Typography level="title-md" sx={{}}>
                      {skill.label}
                    </Typography>
                    <br />
                    <Typography level="body-sm">{skill.description}</Typography>
                  </>
                }
                color="primary"
                checked={selectedSkills[skill.index]?.id === skill.id}
                variant="outlined"
                onChange={() => handleCheckboxChange(skill)}
                slotProps={{
                  checkbox: {
                    sx: { marginY: "auto" },
                  },
                }}
              />
            </ListItemContent>
            <ListItemDecorator>
              <IconButton variant="plain" size="lg" onClick={() => {}}>
                <Settings />
              </IconButton>
            </ListItemDecorator>
          </ListItem>
          <ListDivider inset="gutter" />
        </>
      ))}
    </List>
  );
};

export default SkillSelect;
