import { type CallbackManager } from "langchain/callbacks";
import { OpenAI } from "langchain/llms/openai";

import { LLM, type ModelCreationProps } from "./types";

export const createModel = (creationProps: ModelCreationProps): OpenAI => {
  console.log(`createModel: ${JSON.stringify(creationProps)}`);
  const { temperature, maxTokens, modelName, verbose, streaming, callbacks } =
    creationProps;
  return new OpenAI(
    {
      temperature,
      modelName,
      maxTokens,
      verbose,
      streaming,
      callbacks,
      maxConcurrency: 8,
      maxRetries: maxTokens === 3 ? 0 : 5,
    },
    {
      basePath: "https://oai.hconeai.com/v1",
      baseOptions: {
        headers: {
          "Helicone-Cache-Enabled": "true",
        },
      },
    },
  );
};
