import { VectorDBQAChain } from "langchain/chains";
import { ChainTool, DynamicTool } from "langchain/tools";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { z } from "zod";

import { createEmbeddings, createModel } from "../..";
import { AgentPromptingMethod, LLM, LLM_ALIASES } from "../utils/llms";
import { createVectorIndex } from "../utils/memory";

const schema = z.object({
  search: z.string().nonempty(),
  namespace: z.string().nonempty(),
});

const retrieveMemorySkill = new DynamicTool({
  name: "Retrieve Memory",
  description: `Retrieve an important memory from your memory palace.`,
  // func: async () => {
  func: async (input, _runManager) => {
    const { search, namespace } = schema.parse(input);
    // const vectorStore = await createVectorStore(namespace);
    // const document = new Document({ pageContent: search, metadata: {} });
    // const added = (await vectorStore.addDocuments([document])).join(", ");
    // return added;

    const pineconeIndex = await createVectorIndex();
    const embeddings = createEmbeddings({ modelName: LLM.embeddings });
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace,
    });

    const ltmChain = VectorDBQAChain.fromLLM(
      createModel(
        { modelName: LLM_ALIASES["fast"], maxTokens: 300 },
        AgentPromptingMethod.OpenAIFunctions,
      ),
      vectorStore,
    );

    const description = `*MANDATORY: ONLY CALL UP TO ONCE PER STEP* a comprehensive database extending your knowledge/memory; use this tool before other tools. Provide as much context as necessary to do a semantic search.`;
    const ltmTool = new ChainTool({
      name: "memory database",
      description,
      chain: ltmChain,
    });

    return ltmTool.invoke({ search });
  },
});

export default retrieveMemorySkill;
