import { Document } from "langchain/document";
import { z } from "zod";

import { vectorStoreFromIndex } from "../utils/vectorStore";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  memory: z
    .string()
    .nonempty()
    .describe("The memory to store in the vector store"),
  namespace: z
    .string()
    .nonempty()
    .describe(
      "The namespace to save the memory to. Use the NAMESPACE variable for memory isolation. This improves security and prevents context poisoning.",
    ),
});

const saveMemorySkill = new DynamicZodSkill({
  name: "saveMemory",
  description: `Useful for making sure that important facts and entities are accurately recorded to help other team members achieve the user's GOAL.`,
  func: async (input, _runManager) => {
    try {
      const { memory, namespace } = schema.parse(input);
      const vectorStore = await vectorStoreFromIndex(namespace);
      const document = new Document({ pageContent: memory, metadata: {} });
      const added = (await vectorStore.addDocuments([document])).join(", ");
      return added.length ? memory : `failed: ${memory}`;
    } catch (e) {
      throw e;
    }
  },
  schema,
});

export default saveMemorySkill;
