import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";
import { getBaseUrl } from "@acme/api/utils";

import { env } from "./env.mjs";

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/api/:path*",
    },
  ],
  runtime: "experimental-edge",
};

export function addGeoToApiAgentMiddleware(req: NextRequest) {
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
    return NextResponse.next();
  }
}

export function middleware(req: NextRequest) {
  const { nextUrl: url } = req;

  if (url.pathname.startsWith("/api/agent/")) {
    return addGeoToApiAgentMiddleware(req);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Add allowed clients to CSP
  const allowedClients = [...Object.keys(env.ALLOW_API_CLIENTS), getBaseUrl()];
  const allowedClientsStr =
    allowedClients.length > 0 ? allowedClients.join(" ") : "";

  // Pick the correct bypass/restriction for the environment

  const isDev = env.NODE_ENV === "development";
  const nonceDirective = `'nonce-${nonce}'`;
  const isAllowedClient = allowedClients.some((c) => c === url.origin);
  const shouldAllowUnsafe = isDev || isAllowedClient;
  const scriptDirectives = shouldAllowUnsafe
    ? "'unsafe-inline' 'unsafe-eval'"
    : nonceDirective;
  const styleDirectives = shouldAllowUnsafe
    ? "'unsafe-inline'"
    : nonceDirective;

  // Create the CSP

  const csp = `
    default-src 'self' ${allowedClientsStr};
    script-src 'self' ${scriptDirectives} ${allowedClientsStr};
    style-src 'self' ${styleDirectives} ${allowedClientsStr};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    headers: requestHeaders,
    request: {
      headers: requestHeaders,
    },
  });

  // Set the Access-Control-Allow-Origin header
  if (isAllowedClient) {
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
    }
  }
}
