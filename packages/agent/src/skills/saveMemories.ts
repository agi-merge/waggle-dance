import { Document } from "langchain/document";
import { stringify } from "yaml";
import { z } from "zod";

import { vectorStoreFromIndex } from "../utils/vectorStore";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  memories: z
    .array(z.string().min(1))
    .min(1)
    .describe("The array of memories to store in long-term memory"),
  namespace: z
    .string()
    .min(1)
    .describe(
      "The namespace in which the memories are stored. You must pass the system NAMESPACE variable as the namespace.",
    ),
});

export const stringifyMax = (value: unknown, max: number) => {
  if (value === undefined || value === null) {
    return "…";
  }
  const json = stringify(value);
  return json && json.length < max ? json : `${json.slice(0, max)}…`;
};

const saveMemoriesSkill = new DynamicZodSkill({
  name: "Save Memories",
  description: `Never call this before using other tools. Useful for making sure that important facts and entities are stored in long-term memory to help other team members achieve the user's GOAL.`,
  func: async (input, _runManager) => {
    const { memories, namespace } = schema.parse(input);
    const vectorStore = await vectorStoreFromIndex(namespace);

    // Create a Document for each memory
    const documents = memories.map(
      (memory) =>
        new Document({
          pageContent: memory,
          metadata: { namespace },
        }),
    );

    const added = await vectorStore.addDocuments(documents);
    return added.length
      ? `${memories.map((m) => stringifyMax(m, 300)).join(", ")})}`
      : `Error: ${memories.join(", ")}`;
  },
  schema,
});

export default saveMemoriesSkill;
