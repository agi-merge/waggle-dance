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
    // TODO: smart-xl
    default:
      return process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
  }
}

export const modelTypeForAgentPromptingMethod = (
  methodOrStyle: AgentPromptingMethod | ModelStyle,
): ModelStyle => {
  if (
    methodOrStyle === ModelStyle.Chat ||
    methodOrStyle === AgentPromptingMethod.ChatConversationalReAct ||
    methodOrStyle === AgentPromptingMethod.ChatZeroShotReAct ||
    methodOrStyle === AgentPromptingMethod.OpenAIStructuredChat ||
    methodOrStyle === AgentPromptingMethod.OpenAIFunctions
  ) {
    return ModelStyle.Chat;
  } else {
    return ModelStyle.Instruct;
  }
};

export const createModel = (
  creationProps: ModelCreationProps,
  methodOrStyle: AgentPromptingMethod | ModelStyle,
): OpenAI | ChatOpenAI => {
  console.debug(`createModel: ${creationProps.modelName} `);

  const azureOpenAIApiDeploymentName = getAzureDeploymentName(
    creationProps.modelName,
  );
  let fallbackToOpenAI: boolean;
  if (!azureOpenAIApiDeploymentName && process.env.AZURE_OPENAI_API_KEY) {
    fallbackToOpenAI =
      process.env.AZURE_OPENAI_API_FALLBACK_IF_NO_DEPLOYMENT === "true";
  } else {
    fallbackToOpenAI = true;
  }
  if (modelTypeForAgentPromptingMethod(methodOrStyle) === ModelStyle.Chat) {
    try {
      if (!azureOpenAIApiDeploymentName && !fallbackToOpenAI) {
        throw new Error(
          `Azure OpenAI API deployment name not found and AZURE_OPENAI_API_FALLBACK_IF_NO_DEPLOYMENT !== true`,
        );
      }
      return new ChatOpenAI(
        {
          ...creationProps,
          azureOpenAIApiDeploymentName,
        },
        { basePath: creationProps.basePath },
      );
    } catch (e) {
      if (fallbackToOpenAI) {
        console.warn(`ChatOpenAI creation failed, falling back to OpenAI`);
        delete process.env.AZURE_OPENAI_API_KEY;
        delete process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FALLBACK_IF_NO_DEPLOYMENT;
        delete process.env.AZURE_OPENAI_API_INSTANCE_NAME;
        delete process.env.AZURE_OPENAI_API_VERSION;
        delete process.env.AZURE_OPENAI_BASE_PATH;
      }
      // fall back to OpenAI when Azure OpenAI API deployment name not found
      return new ChatOpenAI(
        {
          ...creationProps,
          azureOpenAIApiDeploymentName: undefined,
          azureOpenAIApiCompletionsDeploymentName: undefined,
          azureOpenAIApiEmbeddingsDeploymentName: undefined,
          azureOpenAIApiInstanceName: undefined,
          azureOpenAIApiKey: undefined,
          azureOpenAIApiVersion: undefined,
          azureOpenAIBasePath: undefined,
        },
        { basePath: creationProps.basePath },
      );
    }
  } else {
    try {
      if (!azureOpenAIApiDeploymentName && !fallbackToOpenAI) {
        throw new Error(
          `Azure OpenAI API deployment name not found and AZURE_OPENAI_API_FALLBACK_IF_NO_DEPLOYMENT !== true`,
        );
      }
      return new OpenAI(
        {
          ...creationProps,
          azureOpenAIApiDeploymentName,
        },
        { basePath: creationProps.basePath },
      );
    } catch {
      if (fallbackToOpenAI) {
        console.warn(`ChatOpenAI creation failed, falling back to OpenAI`);
        delete process.env.AZURE_OPENAI_API_KEY;
        delete process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME;
        delete process.env.AZURE_OPENAI_API_FALLBACK_IF_NO_DEPLOYMENT;
        delete process.env.AZURE_OPENAI_API_INSTANCE_NAME;
        delete process.env.AZURE_OPENAI_API_VERSION;
        delete process.env.AZURE_OPENAI_BASE_PATH;
      }
      return new OpenAI(
        {
          ...creationProps,
          azureOpenAIApiDeploymentName: undefined,
          azureOpenAIApiCompletionsDeploymentName: undefined,
          azureOpenAIApiEmbeddingsDeploymentName: undefined,
          azureOpenAIApiInstanceName: undefined,
          azureOpenAIApiKey: undefined,
          azureOpenAIApiVersion: undefined,
          azureOpenAIBasePath: undefined,
        },
        { basePath: creationProps.basePath },
      );
    }
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
