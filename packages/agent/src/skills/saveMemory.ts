import { Document } from "langchain/document";
import { DynamicTool } from "langchain/tools";
import { z } from "zod";

import { vectorStoreFromIndex } from "../utils/vectorStore";

// import { createVectorStore } from "../..";

/*
export interface DocumentInput<Metadata extends Record<string, any> = Record<string, any>> {
    pageContent: string;
    metadata?: Metadata;
}
export declare class Document<Metadata extends Record<string, any> = Record<string, any>> implements DocumentInput {
    pageContent: string;
    metadata: Metadata;
    constructor(fields: DocumentInput<Metadata>);
}
*/

const schema = z.object({
  memory: z.string().nonempty(),
  namespace: z.string().nonempty(),
});

const saveMemorySkill = new DynamicTool({
  name: "Store Memory",
  description: `Store memory in your memory palace for later retrieval by other team members.`,
  // func: async () => {
  func: async (input, _runManager) => {
    const { memory, namespace } = schema.parse(input);
    const vectorStore = await vectorStoreFromIndex(namespace);
    const document = new Document({ pageContent: memory, metadata: {} });
    const added = (await vectorStore.addDocuments([document])).join(", ");
    return added;
  },
});

export default saveMemorySkill;
