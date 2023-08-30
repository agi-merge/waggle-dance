import { ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";

import { AgentPromptingMethod } from "./llms";
import { type EmbeddingsCreationProps, type ModelCreationProps } from "./types";

export const createModel = (
  creationProps: ModelCreationProps,
  agentPromptingMethod: AgentPromptingMethod,
): OpenAI | ChatOpenAI => {
  console.log(`createModel: ${creationProps.modelName} `);
  if (
    agentPromptingMethod === AgentPromptingMethod.ChatConversationalReAct ||
    agentPromptingMethod === AgentPromptingMethod.ChatZeroShotReAct
  ) {
    return new ChatOpenAI(
      { ...creationProps },
      { basePath: creationProps.basePath },
    );
  } else {
    return new OpenAI(
      { ...creationProps },
      { basePath: creationProps.basePath },
    );
  }
};

export const createEmbeddings = (
  creationProps: EmbeddingsCreationProps,
): Embeddings => {
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
