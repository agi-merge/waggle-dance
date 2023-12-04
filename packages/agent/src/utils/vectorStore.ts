import { Document } from "langchain/document";
import type { Embeddings } from "langchain/embeddings/base";
import { WeaviateStore } from "langchain/vectorstores/weaviate";
import weaviate from "weaviate-ts-client";

import { LLM } from "./llms";
import { createEmbeddings } from "./model";

/// Create a vector store from an existing index.
/// @param indexName The name of the index to use. Must be
export async function vectorStoreFromIndex(
  namespace: string,
  indexName?: string | undefined,
  embeddings?: Embeddings | undefined,
) {
  if (!indexName) {
    indexName = process.env.LONG_TERM_MEMORY_INDEX_NAME;
  }
  if (!indexName) {
    throw new Error("No index name found");
  }
  if (!embeddings) {
    embeddings = createEmbeddings({ modelName: LLM.embeddings });
  }
  const client = createVectorClient();
  const store = await WeaviateStore.fromExistingIndex(embeddings, {
    client,
    indexName,
    metadataKeys: ["namespace"],
    // tenant: namespace,
  });
  return store;
}

export function createVectorClient() {
  if (!process.env.WEAVIATE_API_KEY) {
    throw new Error("No weaviate api key found");
  } else if (!process.env.WEAVIATE_SCHEME) {
    throw new Error("No weaviate scheme found");
  } else if (!process.env.WEAVIATE_HOST) {
    throw new Error("No weaviate host found");
  } else if (!process.env.OPENAI_API_KEY) {
    throw new Error("No openai api key found");
  }

  const client = weaviate.client({
    scheme: process.env.WEAVIATE_SCHEME,
    host: process.env.WEAVIATE_HOST,
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
    // Only needed if using an inference service (e.g. `nearText`, `hybrid` or `generative` queries)
    headers: { "X-OpenAI-ApiKey": process.env.OPENAI_API_KEY },
  });

  return client;
}

export async function insertDocuments(
  docs: Document[],
  namespace: string,
  indexName?: string | undefined,
) {
  if (!indexName) {
    indexName = process.env.LONG_TERM_MEMORY_INDEX_NAME;
  }
  if (!indexName) {
    throw new Error("No index name found");
  }

  const docsWithNamespace = docs.map(
    (doc) => new Document({ ...doc, metadata: { namespace } }),
  );
  const client = createVectorClient();
  return await WeaviateStore.fromDocuments(
    docsWithNamespace,
    createEmbeddings({ modelName: LLM.embeddings }),
    { client, indexName },
  );
}
