import { z } from "zod";

import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  url: z.string().url().describe("One or more of the system FILES' URLs."),
  namespace: z
    .string()
    .min(1)
    .describe(
      "A verification token. You must pass the system NAMESPACE variable as the namespace.",
    ),
});

const downloadFileSkill = new DynamicZodSkill({
  name: "Read File",
  description: `Read/Download private files from your cloud filesystem, after they have been provided to you, or previously saved by you.`,
  func: async (input, _runManager) => {
    const { url, namespace } = schema.parse(input);
    console.debug("downloadFileSkill", url);
    // FIXME: sanitize the url to make sure it's not a security risk, e.g. local filesystem access
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "waggledance.ai/skill",
      },
    });
    if (response.ok) {
      const artifact = await response.blob();
      return artifact
        ? URL.createObjectURL(artifact)
        : "Error: unexpected return value";
    } else {
      return `Error: ${response.status} ${response.statusText}`;
    }
  },
  schema,
});

export default downloadFileSkill;
