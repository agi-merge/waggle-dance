import assert from "assert";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { type DefaultSession, type NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers";
import DiscordProvider from "next-auth/providers/discord";
import {
  type EmailConfig,
  type EmailUserConfig,
} from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";

import { prisma } from "@acme/db";
import { env } from "@acme/env-config";

/**
 * Module augmentation for `next-auth` types
 * Allows us to add custom properties to the `session` object
 * and keep type safety
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

function PostmarkEmailProvider(options: EmailUserConfig): EmailConfig {
  const envFrom = env.EMAIL_FROM;
  const from = envFrom ? envFrom : "waggledance <noreply@waggledance.ai>";
  const server = "https://api.postmarkapp.com/email";
  const token = env.POSTMARK_TOKEN;
  assert(token);
  return {
    id: "email",
    type: "email",
    name: "Email",
    // Server can be an SMTP connectiwon string or a nodemailer config object
    server,
    from,
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest({ identifier: email, url }) {
      // Call the cloud Email provider API for sending emails
      // See https://postmarkapp.com/developer/api/email-api
      const response = await fetch(server, {
        // The body format will vary depending on provider, please see their documentation
        // for further details.
        body: JSON.stringify({
          From: from,
          To: email,
          Subject: "Sign in to Your page",
          TextBody: `Please click here to authenticate - ${url}`,
          HtmlBody: `<p>Please click here to authenticate - <a href="${url}">Authenticate</a></p>`,
          MessageStream: "outbound",
        }),
        headers: {
          // Authentication will also vary from provider to provider, please see their docs.
          "X-Postmark-Server-Token": token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(JSON.stringify(await response.json()));
      }
    },
    options,
  };
}

const providers = (): Provider[] => {
  const providers: Provider[] = [];
  if (env.DISCORD_ID && env.DISCORD_SECRET) {
    providers.push(
      DiscordProvider({
        clientId: env.DISCORD_ID,
        clientSecret: env.DISCORD_SECRET,
      }),
    );
  }
  if (env.GITHUB_ID && env.GITHUB_SECRET) {
    providers.push(
      GithubProvider({
        clientId: env.GITHUB_ID,
        clientSecret: env.GITHUB_SECRET,
      }),
    );
  }
  if (env.EMAIL_FROM && env.POSTMARK_TOKEN) {
    providers.push(PostmarkEmailProvider({}));
  }
  return providers;
};
/**
 * Options for NextAuth.js used to configure
 * adapters, providers, callbacks, etc.
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions: NextAuthOptions = {
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // session.user.role = user.role; <-- put other properties on the session here
      } else {
        console.log("No session.user found");
      }
      return session;
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: providers(),
};
