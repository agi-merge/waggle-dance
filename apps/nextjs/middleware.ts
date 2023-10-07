import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

// run only on homepage
export const config = {
  matcher: "/api/agent/:path*",
};

export function middleware(req: NextRequest) {
  const { nextUrl: url } = req;
  const { geo } = req as { geo: Geo };
  const cca2 = geo?.country || "US";
  const city = geo?.city || "San Francisco";
  const region = geo?.region || "CA";

  url.searchParams.set("country", cca2);
  url.searchParams.set("city", city);
  url.searchParams.set("region", region);

  return NextResponse.rewrite(url);
}
