import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

import countries from "./lib/countries.json";

// run only on homepage
export const config = {
  matcher: "/api/agent/:path*",
};

export function middleware(req: NextRequest) {
  const { nextUrl: url } = req;
  const { geo } = req as { geo: Geo };
  const country = geo?.country || "US";
  const city = geo?.city || "San Francisco";
  const region = geo?.region || "CA";

  const countryInfo = countries.find((x) => x.cca2 === country);

  const languages =
    countryInfo && Object.values(countryInfo.languages).join(", ");

  url.searchParams.set("country", country);
  url.searchParams.set("city", city);
  url.searchParams.set("region", region);
  languages && languages[0] && url.searchParams.set("languages", languages[0]);

  return NextResponse.rewrite(url);
}
