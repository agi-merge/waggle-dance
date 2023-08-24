import { Checkbox, List, ListItem, Stack } from "@mui/joy"
import Typography from "@mui/joy/Typography"

import useSkillStore, {
  skillDatabase,
  type SkillDisplay,
} from "~/stores/skillStore"


const SkillSelect = ({}) => {
  const { selectedSkills, toggleSkill } = useSkillStore();

  const handleCheckboxChange = (skill: SkillDisplay) => {
    toggleSkill(skill);
  };

  return (
    <>
      <Stack
        gap="1rem"
        className="mt-6"
        sx={{
          height: "100%",
          overflow: "scroll",
        }}
      >
        <List
          orientation="horizontal"
          wrap
          sx={{
            "--List-gap": "0.5rem",
            "--ListItem-radius": "0.25rem",
            "--ListItem-minHeight": "5rem",
          }}
        >
          {skillDatabase.map((skill) => (
            <ListItem key={skill.id}>
              <Checkbox
                size="sm"
                sx={{ maxWidth: "80%" }}
                label={
                  <>
                    <Typography level="title-md" sx={{}}>
                      {skill.label}
                    </Typography>
                    <br />
                    <Typography level="body-xs">{skill.description}</Typography>
                  </>
                }
                disableIcon
                overlay
                color="neutral"
                checked={selectedSkills[skill.index]?.id === skill.id}
                variant={
                  selectedSkills[skill.index]?.id === skill.id
                    ? "soft"
                    : "outlined"
                }
                onChange={() => handleCheckboxChange(skill)}
                slotProps={{
                  action: ({ checked }) => ({
                    sx: checked
                      ? {
                          border: "1px solid",
                          borderColor: "primary.500",
                        }
                      : {},
                  }),
                }}
              />
            </ListItem>
          ))}
        </List>
      </Stack>
    </>
  );
};

export default SkillSelect;
