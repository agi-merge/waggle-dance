import { type CallbackManager } from "langchain/callbacks";
import { OpenAI } from "langchain/llms/openai";

import { LLM, type ModelCreationProps } from "./types";

export const createModel = (settings: ModelCreationProps): OpenAI => {
  const { maxTokens, verbose, streaming, callbacks } = settings;
  return new OpenAI(
    {
      temperature: 0,
      modelName: LLM.gpt3_5_turbo,
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
