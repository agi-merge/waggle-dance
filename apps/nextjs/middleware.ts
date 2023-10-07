import { NextResponse, type NextRequest } from "next/server";

import { type Geo } from "@acme/agent";

import cca2Map from "./lib/cca2Map.json";

type CCA2MapType = {
  [key: string]: {
    name: string;
    divisions: { [key: string]: string };
    languages: string[];
  };
};
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

  const countryInfo = (cca2Map as CCA2MapType)[cca2];
  const friendlyCountryName = countryInfo?.name;
  const friendlyRegionName = countryInfo?.divisions[region];

  const languages =
    countryInfo && Object.values(countryInfo.languages).join(", ");

  url.searchParams.set("country", friendlyCountryName || cca2);
  url.searchParams.set("city", city);
  url.searchParams.set("region", friendlyRegionName || region);
  languages && url.searchParams.set("languages", languages);

  return NextResponse.rewrite(url);
}
