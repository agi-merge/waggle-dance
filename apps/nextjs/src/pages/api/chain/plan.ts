import { type NextRequest } from "next/server";
import { planChain } from "@acme/chain";
import { type StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { creationProps, goal } = (await req.json()) as StrategyRequestBody;

  const encoder = new TextEncoder();
  // TODO: make this a signal/reactive so we can stream data without first awaiting the entire chain...
  // Edge functions must return a response within 30 seconds, and this times us out.
  const planResult = await planChain(creationProps, goal);

  const readableStream = new ReadableStream({
    start(controller) {

      const json = JSON.stringify(planResult);
      const chunks = json.match(/.{1,1024}/g); // Split the JSON string into chunks of 1024 characters

      if (chunks) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
      }

      controller.close();
    },
  });

  return new Response(readableStream/*.pipeThrough(transformStream)*/, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
};

export default handler;