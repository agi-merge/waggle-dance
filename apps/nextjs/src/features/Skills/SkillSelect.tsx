// AddDocuments.tsx
import { useState, type Dispatch, type SetStateAction } from "react";
import { KeyboardArrowRight } from "@mui/icons-material";
import { AutocompleteOption, Box, Button } from "@mui/joy";
import Autocomplete, {
  type AutocompleteRenderGetTagProps,
} from "@mui/joy/Autocomplete";
import Stack, { type StackProps } from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import { v4 as uuidv4 } from "uuid";

import Title from "~/features/MainLayout/components/PageTitle";
import ConfigureSkillset from "./components/ConfigureSkillset";

export type SkillDisplay = {
  id: string;
  label: string;
  description: string;
  risk: "low" | "medium" | "high";
  toolkit?: Omit<SkillDisplay, "toolkit">[] | null | undefined;
  isRecommended?: boolean;
  index: number;
};
type SkillData = Pick<
  SkillDisplay,
  "label" | "description" | "isRecommended" | "risk"
>;

const skillsData: SkillData[] = [
  {
    label: "🏃‍♀️ Context Baton",
    isRecommended: true,
    description: "Parent → Child context passing",
    risk: "low",
  },
  {
    label: "💭 Memory",
    isRecommended: true,
    description: "Entities, agent internal scratch pad, vector database",
    risk: "low",
  },
  {
    label: "🗄️ Database",
    isRecommended: true,
    description: "Query databases",
    risk: "medium",
  },
  {
    label: "✉️ Email",
    description: "Send emails, react to emails",
    risk: "high",
  },
  {
    label: "🪝 Webhook",
    description: "React to webhooks",
    risk: "low",
  },
  {
    label: "REST API",
    description: "Make HTTP requests",
    risk: "high",
  },
  {
    label: "Git",
    description: "Push, pull, open pull requests, manage CI, etc.",
    risk: "high",
  },
  {
    label: "Browser",
    isRecommended: true,
    description:
      "Use a headless browser to view, scrape, or interact with websites",
    risk: "medium",
  },
  {
    label: "Files",
    description: "Read, write, and watch files",
    risk: "low",
  },
];

const skills: SkillDisplay[] = skillsData.map((skill, index) => ({
  ...skill,
  id: uuidv4(),
  index: index + 1,
}));

type Props = {
  onClose?: () => void;
};

export type SkillSelectState = [
  SkillDisplay | undefined | null,
  Dispatch<SetStateAction<SkillDisplay | undefined | null>>,
];

type SkillChipProps = {
  skill: (typeof skills)[0];
  getTagProps?: AutocompleteRenderGetTagProps | undefined | null;
  props?: StackProps | null | undefined;
  index: number;
  skillSelectState: SkillSelectState;
} & StackProps;
const SkillChip = ({
  skill,
  getTagProps,
  props,
  index,
  skillSelectState,
}: SkillChipProps) => {
  const tagProps = getTagProps && getTagProps({ index });
  return (
    <>
      {tagProps ? (
        <Stack
          direction={"row"}
          size={tagProps ? "sm" : "md"}
          component={Button}
          variant="outlined"
          {...(tagProps && tagProps)}
        >
          <ConfigureSkillset skillSelectState={skillSelectState} />
          <Button
            size="lg"
            color="neutral"
            variant="plain"
            sx={{ textAlign: "start" }}
            onClick={() => {}}
          >
            <Box className="text-left">
              <Typography level="body-sm" color="primary">
                {skill.label}
              </Typography>
              <Typography level="body-xs">{skill.description}</Typography>
            </Box>
          </Button>
        </Stack>
      ) : (
        <>
          <Stack
            key={skill.id}
            direction={"row"}
            component={Button}
            variant="plain"
            // color="neutral"
            // {...(tagProps && tagProps)}
            {...props}
            color="neutral"
          >
            <ConfigureSkillset skillSelectState={skillSelectState} />
            <Button
              size="lg"
              color="neutral"
              variant="plain"
              sx={{ textAlign: "start" }}
              onClick={() => {}}
            >
              <Box className="w-full text-left">
                <Typography level="body-sm" color="primary">
                  {skill.label}
                </Typography>
                <Typography level="body-xs">{skill.description}</Typography>
              </Box>
            </Button>
          </Stack>
        </>
      )}
    </>
  );
};

const SkillSelect = ({ onClose }: Props) => {
  const skillSelectState = useState<SkillDisplay | undefined | null>(null);
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
          placeholder="Select as many skillsets as makes sense for your goal"
          options={skills}
          autoComplete={true}
          clearText="Clear all"
          renderOption={(props, skill) => (
            <AutocompleteOption {...props}>
              <SkillChip
                skill={skill}
                skillSelectState={skillSelectState}
                index={skill.index}
              />
            </AutocompleteOption>
          )}
          renderTags={(skills, getTagProps) =>
            skills.map((skill) => (
              // <AutocompleteListbox key={skill.id}>
              <SkillChip
                key={skill.id}
                getTagProps={getTagProps}
                skill={skill}
                skillSelectState={skillSelectState}
                index={skill.index}
              />
              // </AutocompleteListbox>
            ))
          }
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
        {/* </IngestContext.Provider> */}
        {/* {openState[0] && <ConfigureSkillset skill={skill} />} */}
      </Stack>
    </>
  );
};

export default SkillSelect;
