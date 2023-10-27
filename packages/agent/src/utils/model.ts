import { ChatOpenAI } from "langchain/chat_models/openai";
import { type Embeddings } from "langchain/embeddings/base";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";

import {
  AgentPromptingMethod,
  LLM_ALIASES,
  ModelStyle,
  type LLMAliasKey,
} from "./llms";
import {
  type EmbeddingsCreationProps,
  type ModelCreationProps,
} from "./OpenAIPropsBridging";

function getAzureDeploymentName(
  modelName: string | undefined,
): string | undefined {
  if (!modelName) {
    return undefined;
  }
  const llmAliasKey = Object.entries(LLM_ALIASES).find(([_key, val]) => {
    if (String(val) === modelName) {
      return true;
    }
  })?.[0];

  switch (llmAliasKey as LLMAliasKey) {
    case "fast":
      return process.env.AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME;
    case "fast-large":
      return process.env.AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME;
    case "smart":
      return process.env.AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME;
    case "smart-large":
      return process.env.AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME;
    default:
      return process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
  }
}

// const azureDeploymentNames: Record<LLM, LLMAliasKey> =  Object.keys(LLM).map((key) => {
//   key = key as LLMAliasKey;
//   return {
//     [LLM[key]]: key,
//   };
// })
export const createModel = (
  creationProps: ModelCreationProps,
  methodOrStyle: AgentPromptingMethod | ModelStyle,
): OpenAI | ChatOpenAI => {
  console.debug(`createModel: ${creationProps.modelName} `);
  if (
    methodOrStyle === ModelStyle.Chat ||
    methodOrStyle === AgentPromptingMethod.ChatConversationalReAct ||
    methodOrStyle === AgentPromptingMethod.ChatZeroShotReAct ||
    methodOrStyle === AgentPromptingMethod.OpenAIStructuredChat ||
    methodOrStyle === AgentPromptingMethod.OpenAIFunctions
  ) {
    return new ChatOpenAI(
      {
        ...creationProps,
        azureOpenAIApiDeploymentName: getAzureDeploymentName(
          creationProps.modelName,
        ),
      },
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
