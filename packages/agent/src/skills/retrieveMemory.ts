import { VectorDBQAChain } from "langchain/chains";
import { z } from "zod";

import { createModel } from "../..";
import { AgentPromptingMethod, LLM_ALIASES } from "../utils/llms";
import { vectorStoreFromIndex } from "../utils/vectorStore";
import AbstractedSkill from "./AbstractedSkill";

const schema = z.object({
  search: z
    .string()
    .nonempty()
    .describe("The text string to search for in the memory database"),
  namespace: z
    .string()
    .nonempty()
    .describe(
      "The namespace from which to retrieve the memory. Use the NAMESPACE variable for memory isolation. This improves security and prevents context poisoning.",
    ),
});

const retrieveMemorySkill = new AbstractedSkill({
  name: "retrieveMemory",
  description: `Retrieve an important memory from your memory palace.`,
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
    const result = await ltmChain.call({ search });
    return JSON.stringify(result); // Convert the result to a string
  },
  schema,
});

export default retrieveMemorySkill;
