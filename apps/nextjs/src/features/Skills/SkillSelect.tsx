// AddDocuments.tsx
import React from "react";
import { KeyboardArrowRight } from "@mui/icons-material";
import { AutocompleteOption, Button } from "@mui/joy";
import Autocomplete from "@mui/joy/Autocomplete";
import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";

import Title from "~/features/MainLayout/components/PageTitle";
import useSkillStore, { skillDatabase } from "~/stores/skillStore";
import SkillChip from "./components/SkillChip";

type Props = {
  onClose?: () => void;
};

const SkillSelect = ({ onClose }: Props) => {
  const { selectedSkills, setSkills, toggleSkill } = useSkillStore();
  const [inputValue, setInputValue] = React.useState("");
  return (
    <>
      <Title title="🔨 Skills">
        <Typography
          level="body-lg"
          sx={{
            userSelect: "none",
            marginBottom: { xs: -1, sm: 0 },
          }}
        >
          Agents can be empowered with skills. Skills reach out to the world,
          and can either create side effects such as emails being sent, or fetch
          data. Skills can wrap Databases.
        </Typography>
      </Title>
      <Stack gap="1rem" className="mt-6">
        {/* <IngestContext.Provider
          value={{
            ingestFiles,
            setIngestFiles,
            ingestUrls,
            setIngestUrls,
          }}
        > */}
        <Autocomplete
          multiple
          autoFocus
          placeholder="Select as many skillsets as makes sense for your goal"
          options={skillDatabase}
          value={selectedSkills}
          isOptionEqualToValue={(option, value) => option?.id === value?.id}
          onChange={(event, newValue) => {
            setSkills(newValue);
          }}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          autoComplete={true}
          clearText="Clear all"
          renderOption={(props, skill) => (
            <AutocompleteOption
              {...props}
              // sx={{ p: 0, m: 0, textAlign: "start", alignContent: "start" }}
            >
              {(skill && (
                <SkillChip
                  skill={skill}
                  index={skill.index}
                  toggleSkill={toggleSkill}
                />
              )) || <></>}
            </AutocompleteOption>
          )}
          renderTags={(skills, getTagProps) =>
            skills
              .map((skill, i) => (
                <React.Fragment key={skill?.id || i}>
                  {skill && (
                    <SkillChip
                      getTagProps={getTagProps}
                      skill={skill}
                      toggleSkill={toggleSkill}
                      index={i}
                    />
                  )}
                </React.Fragment>
              ))
              .filter((skill) => !!skill)
          }
          slotProps={{
            listbox: {},
            option: {},
          }}
        />
        <Button
          className="col-end mt-2"
          color="primary"
          variant="soft"
          onClick={() => {
            if (onClose) onClose();
          }}
        >
          {onClose ? (
            <>
              Save <KeyboardArrowRight />
            </>
          ) : (
            "Done"
          )}
        </Button>
      </Stack>
    </>
  );
};

export default SkillSelect;
