import { Close } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
  type AutocompleteRenderGetTagProps,
  type StackProps,
} from "@mui/joy";

import { type skillDatabase, type SkillDisplay } from "~/stores/skillStore";
import ConfigureSkillset from "./ConfigureSkillset";

type SkillChipProps = {
  skill: (typeof skillDatabase)[0];
  getTagProps?: AutocompleteRenderGetTagProps | undefined | null;
  props?: StackProps | null | undefined;
  index: number;
  toggleSkill?: ((skill: SkillDisplay) => void) | undefined;
} & StackProps;

const SkillChip = ({
  skill,
  getTagProps,
  props,
  index,
  toggleSkill,
}: SkillChipProps) => {
  const tagProps = getTagProps && getTagProps({ index });
  return (
    <Box key={skill.id}>
      {tagProps ? (
        <Stack
          sx={{ p: 0, m: 0, textAlign: "start", alignContent: "start" }}
          direction={"row"}
          size="sm"
          component={Button}
          variant="outlined"
          {...(tagProps && tagProps)}
        >
          {skill && skill.label && (
            <Box
              size="sm"
              component={Button}
              startDecorator={<ConfigureSkillset skill={skill} />}
              endDecorator={
                <IconButton
                  variant="soft"
                  onClick={(e) => {
                    if (toggleSkill) {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSkill(skill);
                    }
                  }}
                >
                  <Close />
                </IconButton>
              }
              color="neutral"
              variant="plain"
              sx={{ textAlign: "start", width: "100%", m: 0, p: 0 }}
              onClick={(e) => {
                if (toggleSkill) {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleSkill(skill);
                }
              }}
            >
              <Box className="text-left">
                <Typography level="body-sm" color="primary">
                  {skill.label}
                </Typography>
                <Typography level="body-xs">{skill.description}</Typography>
              </Box>
            </Box>
          )}
        </Stack>
      ) : (
        <Stack
          key={skill.id}
          direction={"row"}
          // component={Button}
          // variant="plain"
          // color="neutral"
          // {...(tagProps && tagProps)}
          {...props}
          color="neutral"
          padding={0}
        >
          <Button
            startDecorator={<ConfigureSkillset skill={skill} />}
            // endDecorator={<Close />}
            size="sm"
            color="neutral"
            variant="plain"
            sx={{ textAlign: "start", m: 0, p: 0 }}
            onClick={(e) => {
              if (toggleSkill) {
                e.preventDefault();
                e.stopPropagation();
                toggleSkill(skill);
              }
            }}
          >
            <Box className=" text-left">
              <Typography level="body-sm" color="primary">
                {skill.label}
              </Typography>
              <Typography level="body-xs">{skill.description}</Typography>
            </Box>
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default SkillChip;
