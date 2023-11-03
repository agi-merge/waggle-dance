import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

import { env } from "./env.mjs";

export const config = {
  matcher: [
    {
      source: "/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
  runtime: "experimental-edge",
};

export function middleware(req: NextRequest) {
  const { nextUrl: url } = req;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Add allowed clients to CSP
  const allowedClients = Object.keys(env.ALLOW_API_CLIENTS);
  const allowedClientsStr =
    allowedClients.length > 0 ? allowedClients.join(" ") : "";

  // Create a base CSP
  const nonceOrUnsafeForDevScript =
    env.NODE_ENV === "development"
      ? "'unsafe-inline' 'unsafe-eval'"
      : `'nonce-${nonce}'`;
  const nonceOrUnsafeForDevStyle =
    env.NODE_ENV === "development" ? "'unsafe-inline'" : `'nonce-${nonce}'`;
  const csp = `
    default-src 'self' ${allowedClientsStr};
    script-src 'self' ${nonceOrUnsafeForDevScript} ${allowedClientsStr};
    style-src 'self' ${nonceOrUnsafeForDevStyle} ${allowedClientsStr};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  let response;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  if (url.pathname.startsWith("/api/agent/")) {
    const { geo } = req as { geo: Geo };

    const cca2 = geo?.country || "US";
    const city = geo?.city || "San Francisco";
    const region = geo?.region || "CA";

    url.searchParams.set("country", cca2);
    url.searchParams.set("city", city);
    url.searchParams.set("region", region);

    response = NextResponse.rewrite(url, {});
  } else {
    response = NextResponse.next({
      headers: requestHeaders,
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Set the Access-Control-Allow-Origin header
  const origin = req.headers.get("Origin");
  if (origin && allowedClients.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      ["GET", "DELETE", "PATCH", "POST", "PUT", "OPTION"].join(","),
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, X-Cookie, X-CSRF-Token, X-Requested-With,  Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
    );
    setCookieFromXCookie(req, url, response.headers);
  }
  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

// this logic must change to support bearer
function setCookieFromXCookie(
  req: NextRequest,
  url: URL,
  requestHeaders: Headers,
) {
  if (url.pathname.startsWith("/api/ap/")) {
    const rawAuthToken = req.headers.get("X-Cookie") || "";
    // Check if the Authorization header is in the expected format
    if (rawAuthToken.length) {
      // const authTokenParts = rawAuthToken.split(" ");
      // // Check if the split operation resulted in the expected number of parts
      // if (authTokenParts.length === 2) {
      //   const authToken = authTokenParts[1];
      // Remove any non-alphanumeric characters from the token
      const cookieValueRegex = /^[a-zA-Z0-9\-_.]+$/;
      if (cookieValueRegex.test(rawAuthToken)) {
        requestHeaders.append(
          "Cookie",
          `${
            url.protocol === "https:" ? "__Secure-" : ""
          }next-auth.session-token=${rawAuthToken};`,
        );
      }
      // }
    }
  }
}
