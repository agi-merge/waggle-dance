import { Settings } from "@mui/icons-material";
import { IconButton } from "@mui/joy";

import { type SkillSelectState } from "../SkillSelect";

type Props = {
  skillSelectState: SkillSelectState;
};
export default function ConfigureSkillset({ skillSelectState }: Props) {
  const [skillSelected, setSkillSelectState] = skillSelectState;
  return (
    <IconButton
      variant="plain"
      sx={{ background: "transparent", padding: "0.5rem" }}
      onClick={() => {
        setSkillSelectState(skillSelected);
      }}
    >
      <Settings />
    </IconButton>
  );
}
