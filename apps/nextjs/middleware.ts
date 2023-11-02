import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

export const config = {
  matcher: [
    {
      source: "/api/agent/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
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
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
      worker-src 'self';
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' blob: data:;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      block-all-mixed-content;
      upgrade-insecure-requests;
  `;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set(
      "Content-Security-Policy",
      // Replace newline characters and spaces
      cspHeader.replace(/\s{2,}/g, " ").trim(),
    );

    return NextResponse.next({
      headers: requestHeaders,
      request: {
        headers: requestHeaders,
      },
    });
  }
}
