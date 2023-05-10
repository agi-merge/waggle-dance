import { createParser } from "eventsource-parser";

import { type ChainPacket } from "@acme/chain";

import { type StrategyRequestBody } from "~/pages/api/chain/types";

export default async function stream(
  url: string,
  data: StrategyRequestBody,
  renderMessage: (message: ChainPacket) => void,
  sendErrorMessage: (error: string) => void,
) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 429) {
        sendErrorMessage("Rate limit exceeded. Please try again later.");
      }
      throw new Error(`Fetch error: ${response.statusText}`);
    }

    const decoder = new TextDecoder();

    async function onParse(event: any) {
      if (event.type === "event") {
        const data = event.data;

        if (data.trim() !== "") {
          try {
            const parsed = JSON.parse(data);
            parsed && renderMessage(parsed as ChainPacket);
          } catch (e) {
            sendErrorMessage(`ERROR parsing message: ${e}`);
          }
        }
      }
    }

    const parser = createParser(onParse);

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response.body as any) {
          parser.feed(decoder.decode(chunk));
        }
        controller.close();
      },
    });

    await new Response(stream);
  } catch (e) {
    console.error(e);
    throw e;
  }
}
