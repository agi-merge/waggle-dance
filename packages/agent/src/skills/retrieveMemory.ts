import { VectorDBQAChain } from "langchain/chains";
import { z } from "zod";

import { createModel } from "../..";
import { AgentPromptingMethod, LLM_ALIASES } from "../utils/llms";
import { vectorStoreFromIndex } from "../utils/vectorStore";
import DynamicZodSkill from "./DynamicZodSkill";

const schema = z.object({
  search: z
    .string()
    .min(1)
    .describe(
      "The text string to query in the memory database. It is ideally in the form of a detailed question.",
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
    const ltmChain = VectorDBQAChain.fromLLM(
      createModel(
        { modelName: LLM_ALIASES["fast"], maxTokens: 300 },
        AgentPromptingMethod.OpenAIFunctions,
      ),
      vectorStore,
    );
    const result = await ltmChain.call({ query: search });
    if ("text" in result && typeof result["text"] === "string") {
      return result.text;
    }
    return JSON.stringify(result); // Convert the result to a string
  },
  schema,
});

export default retrieveMemorySkill;
