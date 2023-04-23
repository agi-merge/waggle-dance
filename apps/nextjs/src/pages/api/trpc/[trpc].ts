import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter, createTRPCContext } from "@acme/api";
import { type NextApiRequest, type NextApiResponse } from "next";
import { getBaseUrl } from "~/utils/api";

// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});

// @see https://nextjs.org/docs/api-routes/introduction
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // We can use the response object to enable CORS
  // res.setHeader('Access-Control-Allow-Origin', '*');
  // res.setHeader('Access-Control-Request-Method', '*');
  // res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  // res.setHeader('Access-Control-Allow-Headers', '*');

  // If you need to make authenticated CORS calls then
  // remove what is above and uncomment the below code

  // Allow-Origin has to be set to the requesting domain that you want to send the credentials back to
  res.setHeader('Access-Control-Allow-Origin', getBaseUrl());
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // finally pass the request on to the tRPC handler
  return nextApiHandler(req, res);
}