import { type NextRequest } from "next/server";
import { planChain } from "@acme/chain";
import { type StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const { creationProps, goal } = (await req.json()) as StrategyRequestBody;
  const planResult = await planChain(creationProps, goal);

  const encoder = new TextEncoder();
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

  // const transformStream = new TransformStream({
  //   transform(chunk, controller) {
  //     encoder
  //     const data = encoder.decode(chunk);
  //     // Process the data as needed
  //     controller.enqueue(encoder.encode(data));
  //   },
  // });

  return new Response(readableStream/*.pipeThrough(transformStream)*/, {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
};

export default handler;