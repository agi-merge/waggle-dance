import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app isn't
   * built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string().min(1)
        : z.string().min(1).optional(),
    NEXTAUTH_URL: z.preprocess(
      // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
      // Since NextAuth.js automatically uses the VERCEL_URL if present.
      (str) => process.env.VERCEL_URL ?? str,
      // VERCEL_URL doesn't include `https` so it cant be validated as a URL
      process.env.VERCEL ? z.string() : z.string().url(),
    ),
    // Add `.min(1) on ID and SECRET if you want to make sure they're not empty
    DISCORD_ID: z.string().min(19).max(19).optional(),
    DISCORD_SECRET: z.string().min(32).max(32).optional(),
    POSTMARK_TOKEN: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    MEMORY_TYPE: z
      .enum([
        "buffer",
        "motorhead",
        "conversation",
        "redis",
        "upstash-redis",
        "vector",
      ])
      .optional(),
    MEMORY_URL: z.string().url().optional(),
    MEMORY_REST_API_URL: z.string().url().optional(),
    MEMORY_REST_API_TOKEN: z.string().optional(),
    MEMORY_REST_API_READ_ONLY_TOKEN: z.string().optional(),
    GITHUB_ID: z.string().min(20).max(21).optional(),
    GITHUB_SECRET: z.string().min(40).max(40).optional(),
    OPENAI_API_KEY: z.string().min(51).max(51),
    OPENAI_ORGANIZATION_ID: z.string().optional(),
    SERPAPI_API_KEY: z.string().min(64).max(64).optional(),
    PINECONE_API_KEY: z.string().min(36).max(36),
    PINECONE_ENVIRONMENT: z.string().min(1),
    PINECONE_INDEX: z.string().min(1),
    LANGCHAIN_TRACE: z.boolean().optional(),
    EDGE_CONFIG: z.string().url().optional(),
    EDGE_CONFIG_WRITE: z.string().url().optional(),
    VERCEL_ACCESS_TOKEN: z.string().optional(),
  },
  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_APP_VERSION: z.string().optional(),
    NEXT_PUBLIC_DISCORD_INVITE_URL: z.string().url().optional(),
    NEXT_PUBLIC_LANGCHAIN_API_URL: z.string().url().optional(),
    NEXT_PUBLIC_LANGCHAIN_VERBOSE: z.string().optional(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    DISCORD_ID: process.env.DISCORD_ID,
    DISCORD_SECRET: process.env.DISCORD_SECRET,
    MEMORY_TYPE: process.env.MEMORY_TYPE,
    MEMORY_URL: process.env.MEMORY_URL,
    MEMORY_REST_API_URL: process.env.MEMORY_REST_API_URL,
    MEMORY_REST_API_TOKEN: process.env.MEMORY_REST_API_TOKEN,
    MEMORY_REST_API_READ_ONLY_TOKEN:
      process.env.MEMORY_REST_API_READ_ONLY_TOKEN,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_ORGANIZATION_ID: process.env.OPENAI_ORGANIZATION_ID,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_DISCORD_INVITE_URL: process.env.NEXT_PUBLIC_DISCORD_INVITE_URL,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
    PINECONE_INDEX: process.env.PINECONE_INDEX,
    NEXT_PUBLIC_LANGCHAIN_VERBOSE: process.env.NEXT_PUBLIC_LANGCHAIN_VERBOSE,
    LANGCHAIN_TRACE: process.env.LANGCHAIN_TRACE,
    EDGE_CONFIG: process.env.EDGE_CONFIG,
    EDGE_CONFIG_WRITE: process.env.EDGE_CONFIG_WRITE,
    VERCEL_ACCESS_TOKEN: process.env.VERCEL_ACCESS_TOKEN,
    NEXT_PUBLIC_LANGCHAIN_API_URL: process.env.NEXT_PUBLIC_LANGCHAIN_API_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    POSTMARK_TOKEN: process.env.POSTMARK_TOKEN,
  },
});
