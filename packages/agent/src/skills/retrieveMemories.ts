import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";
import { z } from "zod";

import { vectorStoreFromIndex } from "../utils/vectorStore";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  retrievals: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "The search queries to perform the similarity search with. Each search query will have its own set of matching memories.",
    ),
  namespace: z
    .string()
    .min(1)
    .describe("Memory Namespace from your system task description."),
});

const retrieveMemoriesSkill = new DynamicZodSkill({
  name: "retrieveMemories",
  description: `This is useful for retrieving multiple memories and entities from your long-term memories. If your task ID starts with "1-", do not use this before other tools.`,
  func: async (input, _runManager) => {
    const { retrievals, namespace } = schema.parse(input);
    const vectorStore = await vectorStoreFromIndex(namespace);

    const minSimilarityScore = 0.66;
    const retriever = ScoreThresholdRetriever.fromVectorStore(vectorStore, {
      minSimilarityScore,
      maxK: 4,
      filter: {
        where: {
          operator: "Equal",
          path: ["namespace"],
          valueText: namespace,
        },
      },
    });

    const relevantDocs = (
      await Promise.all(
        retrievals.map((retrieval) =>
          retriever.getRelevantDocuments(retrieval),
        ),
      )
    ).flat();

    const returnValue = `Retrieved ${
      relevantDocs.length
    } memories: ${relevantDocs.join("\n")}`;

    console.debug(
      `retrieveMemoriesSkill(${retrievals.slice(0, 100)})=`,
      returnValue,
    );
    return relevantDocs.length > 0
      ? returnValue
      : "Error: No relevant memories";
  },
  schema,
});

export default retrieveMemoriesSkill;
