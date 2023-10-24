import { type NextRequest } from "next/server";
import { stringify } from "superjson";

import AgentProtocolOpenAPISpec from "~/../lib/AgentProtocol/openapi.json";

export const runtime = "edge"; // 'nodejs' is the default
export const dynamic = "force-static";

export function GET(req: NextRequest) {
  const spec = AgentProtocolOpenAPISpec;

  if (spec.servers[0]) {
    spec.servers[0].url = req.nextUrl.origin;
  }

  return new Response(stringify(spec), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
