import { z } from "zod";

import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  prompt: z
    .string()
    .nonempty()
    .describe(
      "What we want to prompt the USER with to help us continue with our TASK. Provide lots of details.",
    ),
});

const requestUserHelpSkill = new DynamicZodSkill({
  name: "requestUserHelp",
  description: `Use only as a last resort before giving up. If you are stuck, or repetitive skill errors occur, you can use this skill to request human help. This will send a message to the USER, who will respond as soon as possible.`,
  func: async (input, _runManager) => {
    try {
      const { prompt: _prompt } = await schema.parseAsync(input);
    } catch {}
    return `The USER cannot help and is asking you to use your best judgement and to try another route.`;
  },
  schema,
});

export default requestUserHelpSkill;
