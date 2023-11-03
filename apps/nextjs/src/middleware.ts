import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

export const config = {
  matcher: [
    {
      source: "/api/:path*",
    },
  ],
  runtime: "experimental-edge",
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
    // const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    const requestHeaders = new Headers(req.headers);
    // allow bypassing CORS for agent protocol requests
    // if (env.NODE_ENV === "development" && env.CORS_BYPASS_URL) {
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
              `${
                url.protocol === "https:" ? "__Secure-" : ""
              }next-auth.session-token=${authToken};`,
            );
          }
        }

        return NextResponse.next({
          headers: requestHeaders,
          request: {
            headers: requestHeaders,
          },
        });
      }
    }
  }
}
