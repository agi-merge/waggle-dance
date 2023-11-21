import { z } from "zod";

import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe(
      "What we want to prompt the USER with to help us continue with our TASK. Provide lots of details.",
    ),
});

class HumanInTheLoopError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "HumanInTheLoopError";
  }
}
const requestUserHelpSkill = new DynamicZodSkill({
  name: "request_user_help",
  readableName: "Request Human Help",
  description: `Use only as a last resort before giving up. If you are stuck, or the same error occurs more than once for a required step, you can use this skill to request human help.`,
  func: async (input, _runManager) => {
    let parsed: { prompt: string };

    try {
      // models will sometimes pass strings in, just assume that is the prompt
      if (typeof input === "string") {
        parsed = { prompt: input };
      } else {
        parsed = await schema.parseAsync(input);
      }
    } catch {
      parsed = { prompt: "error" };
    }
    console.warn(`requestUserHelpSkill:`, parsed.prompt);
    throw new HumanInTheLoopError(`Agent Stuck: ${parsed.prompt}`);
  },
  schema,
});

export default requestUserHelpSkill;
