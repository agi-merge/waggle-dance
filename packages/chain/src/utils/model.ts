import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";

import { type EmbeddingsCreationProps, type ModelCreationProps } from "./types";

export const createModel = (creationProps: ModelCreationProps): OpenAI => {
  console.log(`createModel: ${creationProps.modelName} `);
  return new OpenAI(
    {
      ...creationProps,
    },
    // {
    //   basePath: "https://oai.hconeai.com/v1", // TODO: move this to .env
    //   baseOptions: {
    //     headers: {
    //       "Helicone-Cache-Enabled": "true",
    //     },
    //   },
    // },
  );
};

export const createEmbeddings = (
  creationProps: EmbeddingsCreationProps,
): OpenAIEmbeddings => {
  return new OpenAIEmbeddings(
    { ...creationProps },
    // {
    //   basePath: "https://oai.hconeai.com/v1", // TODO: move this to .env
    //   baseOptions: {
    //     headers: {
    //       "Helicone-Cache-Enabled": "true",
    //       // TODO: migrate to bearer token if helicone is used
    //     },
    //   },
    // },
  );
};
