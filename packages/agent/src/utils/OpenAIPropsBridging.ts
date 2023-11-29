import type {OpenAIEmbeddingsParams} from "langchain/embeddings/openai";
import type {BaseLLMParams} from "langchain/llms/base";
import type {OpenAIInput} from "langchain/llms/openai";

interface OpenAIConfigurationParameters {
  apiKey?:
    | string
    | Promise<string>
    | ((name: string) => string)
    | ((name: string) => Promise<string>);
  organization?: string;
  username?: string;
  password?: string;
  accessToken?:
    | string
    | Promise<string>
    | ((name?: string, scopes?: string[]) => string)
    | ((name?: string, scopes?: string[]) => Promise<string>);
  basePath?: string;
  baseOptions?: unknown;
  formDataCtor?: new () => unknown;
}

interface OpenAIKeyProvider {
  openAIApiKey?: string;
}
export interface ModelCreationProps
  extends Partial<OpenAIInput>,
    BaseLLMParams,
    OpenAIKeyProvider,
    OpenAIConfigurationParameters {
  verbose?: boolean;
}

export interface EmbeddingsCreationProps
  extends Partial<OpenAIEmbeddingsParams>,
    OpenAIKeyProvider,
    OpenAIConfigurationParameters {
  verbose?: boolean;
}
