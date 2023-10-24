import { type NextRequest } from "next/server";

import AgentProtocolOpenAPISpec from "~/../lib/AgentProtocol/openapi.json";

export const runtime = "edge";
export const dynamic = "force-static";

export function GET(req: NextRequest) {
  const spec = AgentProtocolOpenAPISpec;

  if (spec.servers[0]) {
    spec.servers[0].url = req.nextUrl.origin;
  }

  return Response.json(spec, {
    status: 200,
  });
}
