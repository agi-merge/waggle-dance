import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

import { env } from "./env.mjs";

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

export function middleware(req: NextRequest) {
  const { nextUrl: url } = req;

  if (url.pathname.startsWith("/api/agent/")) {
    const { geo } = req as { geo: Geo };

    const cca2 = geo?.country || "US";
    const city = geo?.city || "San Francisco";
    const region = geo?.region || "CA";

    url.searchParams.set("country", cca2);
    url.searchParams.set("city", city);
    url.searchParams.set("region", region);

    return NextResponse.rewrite(url);
  } else {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const requestHeaders = new Headers(req.headers);

    // allow bypassing CORS for agent protocol requests
    if (env.NODE_ENV === "development" && env.CORS_BYPASS_URL) {
      if (url.pathname.startsWith("/api/ap/")) {
        const rawAuthToken = req.headers.get("Authorization") || "";

        // Check if the Authorization header is in the expected format
        if (rawAuthToken.startsWith("Bearer ")) {
          const authTokenParts = rawAuthToken.split(" ");

          // Check if the split operation resulted in the expected number of parts
          if (authTokenParts.length === 2) {
            const authToken = authTokenParts[1]!;
            // Remove any non-alphanumeric characters from the token
            // const sanitizedAuthToken = authToken.replace(/[^a-zA-Z0-9]/g, "");
            const cookieValueRegex = /^[a-zA-Z0-9\-_.]+$/;
            if (cookieValueRegex.test(authToken)) {
              requestHeaders.append(
                "Cookie",
                `next-auth.session-token=${authToken};`,
              );
            }
          }
        }

        // Looser CSP for development
        const devCspHeader = `
        default-src 'self' ${env.CORS_BYPASS_URL};
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${env.CORS_BYPASS_URL};
        worker-src 'self' ${env.CORS_BYPASS_URL};
        style-src 'self' 'nonce-${nonce}' ${env.CORS_BYPASS_URL};
        img-src 'self' blob: data: ${env.CORS_BYPASS_URL};
        font-src 'self' ${env.CORS_BYPASS_URL};
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
      `;

        requestHeaders.set("x-nonce", nonce);
        requestHeaders.set(
          "Content-Security-Policy",
          // Replace newline characters and spaces
          devCspHeader.replace(/\s{2,}/g, " ").trim(),
        );
      }
    } else {
      const cspHeader = `
        default-src 'self';
        script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${env.NEXTAUTH_URL};
        worker-src 'self' ${env.NEXTAUTH_URL};
        style-src 'self' 'nonce-${nonce}' ${env.NEXTAUTH_URL};
        img-src 'self' blob: data: ${env.NEXTAUTH_URL};
        font-src 'self' ${env.NEXTAUTH_URL};
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        block-all-mixed-content;
        upgrade-insecure-requests;
        connect-src 'self' ${env.NEXTAUTH_URL};
      `;
      requestHeaders.set("x-nonce", nonce);
      requestHeaders.set(
        "Content-Security-Policy",
        // Replace newline characters and spaces
        cspHeader.replace(/\s{2,}/g, " ").trim(),
      );
    }
    return NextResponse.next({
      headers: requestHeaders,
      request: {
        headers: requestHeaders,
      },
    });
  }
}
