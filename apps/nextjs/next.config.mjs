/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
// !process.env.SKIP_ENV_VALIDATION && (await import("./src/env.mjs"));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@acme/api", "@acme/auth", "@acme/db", "@acme/agent"],
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: !!process.env.CI },
  typescript: { ignoreBuildErrors: !!process.env.CI },
  redirects: async () => [
    { source: "/", destination: "/goal", permanent: true },
  ],
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.module.rules.push({
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,
      },
    });
    config.experiments = {
      ...config.experiments,
      ...{ asyncWebAssembly: true },
      layers: true,
    };

    config.resolve.alias["@mui/material"] = "@mui/joy";

    return config;
  },
  async headers() {
    if (!process.env.ALLOW_API_CLIENTS) {
      return [];
    }
    const json = JSON.parse(process.env.ALLOW_API_CLIENTS);
    const allowedClients = Object.entries(json).filter(
      ([_, c]) => c && c.client,
    );
    const headers = allowedClients.map(([domain, client]) => {
      return {
        source: client.source,
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: domain,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTION",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Authorization, X-Cookie, X-CSRF-Token, X-Requested-With,  Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      };
    });

    return headers;
  },
  // async headers() {
  //   if (process.env.NODE_ENV === "development" && process.env.CORS_BYPASS_URL) {
  //     console.warn("Bypassing CORS");
  //     return [
  //       // {
  //       //   source: "/(.*)",
  //       //   headers: [
  //       //     { key: "Content-Security-Policy", value: "default-src 'self'" },
  //       //   ],
  //       // },
  //       {
  //         // matching all API routes
  //         source: "/api/:path*",
  //         headers: [
  //           { key: "Access-Control-Allow-Credentials", value: "true" },
  //           {
  //             key: "Access-Control-Allow-Origin",
  //             value: process.env.CORS_BYPASS_URL,
  //           },
  //           {
  //             key: "Access-Control-Allow-Methods",
  //             value: "GET,DELETE,PATCH,POST,PUT,OPTION",
  //           },
  //           {
  //             key: "Access-Control-Allow-Headers",
  //             value:
  //               "Authorization, X-CSRF-Token, X-Requested-With,  Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  //           },
  //         ],
  //       },
  //     ];
  //   } else {
  //     return [];
  //   }
  // },
};

export default config;
