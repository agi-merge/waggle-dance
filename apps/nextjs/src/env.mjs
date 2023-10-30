import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

import { LLMAliasKeys } from "@acme/agent/src/utils/llms";

const StartsWithCapital = z.string().refine((value) => /^[A-Z]/.test(value), {
  message: "Must start with a capital letter",
});

export const env = createEnv({
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1).optional()
        : z.string().min(1).optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      // additionally, only make this required in NEXTAUTH_URL is set
      process.env.VERCEL
        ? process.env.NEXTAUTH_URL
          ? z.string()
          : z.string().optional()
        : process.env.NEXTAUTH_URL
        ? z.string().url()
        : z.string().url().optional(),
    ),
    // Add `.min(1) on ID and SECRET if you want to make sure they're not empty
    DISCORD_ID: z.string().min(19).max(19).optional(),
    DISCORD_SECRET: z.string().min(32).max(32).optional(),
    POSTMARK_TOKEN: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    MEMORY_TYPE: z.enum(["buffer", "conversation", "vector"]).optional(),
    GITHUB_ID: z.string().min(20).max(21).optional(),
    GITHUB_SECRET: z.string().min(40).max(40).optional(),
    OPENAI_API_KEY: z.string().min(51).max(51).optional(),
    OPENAI_ORGANIZATION_ID: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_API_VERSION: z.string().optional(),
    AZURE_OPENAI_API_INSTANCE_NAME: z.string().optional(),
    AZURE_OPENAI_BASE_PATH: z.string().url().optional(),
    AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME: z.string().optional(),
    AZURE_OPENAI_API_DEPLOYMENT_NAME: z.string().optional(),
    AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME: z.string().optional(),
    AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME: z.string().optional(),
    AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME: z.string().optional(),
    AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME: z.string().optional(),
    SERPAPI_API_KEY: z.string().min(64).max(64).optional(),
    SEARCHAPI_API_KEY: z.string().min(24).optional(),
    WEAVIATE_SCHEME: z.enum(["http", "https"]),
    WEAVIATE_HOST: z.string().min(1),
    WEAVIATE_API_KEY: z.string().min(1),
    VECTOR_NAMESPACE_SALT: z.string().min(32),
    LONG_TERM_MEMORY_INDEX_NAME: StartsWithCapital.optional(),
    LANGCHAIN_TRACING_V2: z.boolean().or(z.string()).optional(),
    LANGCHAIN_ENDPOINT: z.string().url().optional(),
    LANGCHAIN_API_KEY: z.string().nonempty().optional(),
    LANGCHAIN_PROJECT: z.string().nonempty().optional(),
    EDGE_CONFIG: z.string().url().optional(),
    KV_URL: z.string().url(),
    KV_REST_API_URL: z.string().url(),
    KV_REST_API_TOKEN: z.string().nonempty(),
    KV_REST_API_READ_ONLY_TOKEN: z.string().nonempty(),
    WOLFRAM_APP_ID: z.string().optional(),
    EXE_TRAJECTORY_EVALUATION: z
      .preprocess(
        (val) => (val === "false" ? false : val === "true" ? true : val),
        z.boolean().or(z.number().gte(0).lte(1)),
      )
      .optional(),
    POSTGRES_PRISMA_URL: z.string().url(),
    POSTGRES_URL_NON_POOLING: z.string().url(),
  },
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_DISCORD_INVITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_LANGCHAIN_VERBOSE: z.string().optional(),
    NEXT_PUBLIC_LANGCHAIN_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_HIDE_LLM: z
      .string()
      .refine((str) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(str);
          return Array.isArray(parsed);
        } catch (e) {
          return false;
        }
      }, "Must be a valid JSON array")
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .transform((str) => JSON.parse(str))
      .optional()
      .default(`["${LLMAliasKeys.SmartLarge}", "${LLMAliasKeys.Embeddings}"]`),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DISCORD_ID: process.env.DISCORD_ID,
    DISCORD_SECRET: process.env.DISCORD_SECRET,
    MEMORY_TYPE: process.env.MEMORY_TYPE,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_API_INSTANCE_NAME: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
    AZURE_OPENAI_BASE_PATH: process.env.AZURE_OPENAI_BASE_PATH,
    AZURE_OPENAI_API_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_FAST_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_FAST_LARGE_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_SMART_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_SMART_LARGE_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME:
      process.env.AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME,
    SEARCHAPI_API_KEY: process.env.SEARCHAPI_API_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_DISCORD_INVITE_URL: process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
    WEAVIATE_API_KEY: process.env.WEAVIATE_API_KEY,
    WEAVIATE_SCHEME: process.env.WEAVIATE_SCHEME,
    WEAVIATE_HOST: process.env.WEAVIATE_HOST,
    LONG_TERM_MEMORY_INDEX_NAME: process.env.LONG_TERM_MEMORY_INDEX_NAME,
    VECTOR_NAMESPACE_SALT: process.env.VECTOR_NAMESPACE_SALT,
    NEXT_PUBLIC_LANGCHAIN_VERBOSE: process.env.NEXT_PUBLIC_LANGCHAIN_VERBOSE,
    NEXT_PUBLIC_LANGCHAIN_API_URL: process.env.NEXT_PUBLIC_LANGCHAIN_API_URL,
    LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2,
    LANGCHAIN_ENDPOINT: process.env.LANGCHAIN_ENDPOINT,
    LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
    LANGCHAIN_PROJECT: process.env.LANGCHAIN_PROJECT,
    EDGE_CONFIG: process.env.EDGE_CONFIG,
    EMAIL_FROM: process.env.EMAIL_FROM,
    POSTMARK_TOKEN: process.env.POSTMARK_TOKEN,
    KV_URL: process.env.KV_URL,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    KV_REST_API_READ_ONLY_TOKEN: process.env.KV_REST_API_READ_ONLY_TOKEN,
    WOLFRAM_APP_ID: process.env.WOLFRAM_APP_ID,
    EXE_TRAJECTORY_EVALUATION: process.env.EXE_TRAJECTORY_EVALUATION,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    NEXT_PUBLIC_HIDE_LLM: process.env.NEXT_PUBLIC_HIDE_LLM,
  },
});
