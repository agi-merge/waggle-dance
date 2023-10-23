import { type NextRequest } from "next/server";
import { stringify } from "superjson";

import AgentProtocolOpenAPISpec from "~/../lib/AgentProtocol/openapi.json";

export const config = {
  runtime: "edge",
};

// (spec; exposes the agent protocol, not part of it)
export default function handler(req: NextRequest) {
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
