import { Document } from "langchain/document";
import { DynamicTool } from "langchain/tools";
import { z } from "zod";

import { createVectorStore } from "../utils/memory";

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
  name: "Save Memory",
  description: `save an important memory to your memory palace.`,
  // func: async () => {
  func: async (input, _runManager) => {
    const { memory, namespace } = schema.parse(input);
    const vectorStore = await createVectorStore(namespace);
    const document = new Document({ pageContent: memory, metadata: {} });
    const added = (await vectorStore.addDocuments([document])).join(", ");
    return added;
  },
});

export default saveMemorySkill;
