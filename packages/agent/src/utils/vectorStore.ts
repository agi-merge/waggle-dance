import { Document } from "langchain/document";
import { WeaviateStore } from "langchain/vectorstores/weaviate";
import weaviate from "weaviate-ts-client";

import { env } from "@acme/env-config";

import { LLM } from "./llms";
import { createEmbeddings } from "./model";

/// Create a vector store from an existing index.
/// @param indexName The name of the index to use. Must be
export async function vectorStoreFromIndex(
  namespace: string,
  indexName?: string | undefined,
) {
  if (!indexName) {
    indexName = env.LONG_TERM_MEMORY_INDEX_NAME;
  }
  if (!indexName) {
    throw new Error("No index name found");
  }
  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
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
  if (!env.WEAVIATE_API_KEY) {
    throw new Error("No weaviate api key found");
  } else if (!env.WEAVIATE_SCHEME) {
    throw new Error("No weaviate scheme found");
  } else if (!env.WEAVIATE_HOST) {
    throw new Error("No weaviate host found");
  } else if (!env.OPENAI_API_KEY) {
    throw new Error("No openai api key found");
  }

  const client = weaviate.client({
    scheme: env.WEAVIATE_SCHEME,
    host: env.WEAVIATE_HOST,
    apiKey: new weaviate.ApiKey(env.WEAVIATE_API_KEY),
    // Only needed if using an inference service (e.g. `nearText`, `hybrid` or `generative` queries)
    headers: { "X-OpenAI-ApiKey": env.OPENAI_API_KEY },
  });

  return client;
}

export async function insertDocuments(
  docs: Document[],
  namespace: string,
  indexName?: string | undefined,
) {
  if (!indexName) {
    indexName = env.LONG_TERM_MEMORY_INDEX_NAME;
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
