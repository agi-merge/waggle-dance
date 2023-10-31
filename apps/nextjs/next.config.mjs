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
};

export default config;
