import DiscordProvider from "@auth/core/providers/discord";
import GithubProvider from "@auth/core/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth";

import { prisma } from "@acme/db";

export type { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
// const providers = (): Provider[] => {
//   const providers: Provider[] = [];
//   if (process.env.DISCORD_ID && process.env.DISCORD_SECRET) {
//     providers.push(
//       DiscordProvider({
//         clientId: process.env.DISCORD_ID,
//         clientSecret: process.env.DISCORD_SECRET,
//       }),
//     );
//   }
//   if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
//     providers.push(
//       GithubProvider({
//         clientId: process.env.GITHUB_ID,
//         clientSecret: process.env.GITHUB_SECRET,
//       }),
//     );
//   }
//   return providers;
// };

// const authConfig = {
//   adapter: PrismaAdapter(prisma),
//   providers: providers(),
//   callbacks: {
//     session: ({ session, user }) => ({
//       ...session,
//       user: {
//         ...session.user,
//         id: user.id,
//       },
//     }),
//   },
// }; // satisfies AuthConfig;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [DiscordProvider, GithubProvider],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
});
