import { ScoreThresholdRetriever } from "langchain/retrievers/score_threshold";
import { z } from "zod";

import { vectorStoreFromIndex } from "../utils/vectorStore";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  search: z
    .string()
    .min(1)
    .describe(
      "The search query to perform the similarity search on memory with.",
    ),
  namespace: z
    .string()
    .min(1)
    .describe(
      "The namespace from which to retrieve the memory. You must pass the NAMESPACE variable as the namespace.",
    ),
});

const retrieveMemorySkill = new DynamicZodSkill({
  name: "retrieveMemory",
  description: `This is useful for retrieving memories and entities from your memory palace. It performs a similarity search using a vector store and combines the search results.`,
  func: async (input, _runManager) => {
    const { search, namespace } = schema.parse(input);
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

    const relevantDocs = await retriever.getRelevantDocuments(search);
    const returnValue = relevantDocs
      // .map(([doc, score]) =>
      //   score > minSimilarityScore ? doc.pageContent : null,
      // )
      // .filter((p) => !!p)
      .join("\n");

    console.debug(`retrieveMemorySkill(${search.slice(0, 100)})=`, returnValue);
    return returnValue.trim().length > 0
      ? returnValue
      : "Error: No relevant memories";
  },
  schema,
});

export default retrieveMemorySkill;
