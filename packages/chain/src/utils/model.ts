import { type CallbackManager } from "langchain/callbacks";
import { OpenAI } from "langchain/llms/openai";

import { LLM, type ModelCreationProps } from "./types";

export const createModel = (creationProps: ModelCreationProps): OpenAI => {
  console.log(`createModel: ${JSON.stringify(creationProps)}`);
  return new OpenAI(
    {
      ...creationProps,
    },
    {
      basePath: "https://oai.hconeai.com/v1", // TODO: move this to .env
      baseOptions: {
        headers: {
          "Helicone-Cache-Enabled": "true",
          // TODO: migrate to bearer token if helicone is used
        },
      },
    },
  );
};
