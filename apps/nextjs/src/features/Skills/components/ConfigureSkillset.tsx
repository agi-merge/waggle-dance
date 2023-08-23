import { Settings } from "@mui/icons-material";
import { IconButton } from "@mui/joy";

import { type SkillDisplay } from "~/stores/skillStore";

type Props = {
  skill: SkillDisplay;
};
export default function ConfigureSkillset({ skill }: Props) {
  return (
    <IconButton
      sx={{ background: "transparent", padding: 0, margin: 0 }}
      className="text-left"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        alert(`configure skillset ${skill.label} coming soon`);
      }}
    >
      <Settings />
    </IconButton>
  );
}
