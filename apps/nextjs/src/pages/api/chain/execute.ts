import { type IncomingMessage, type ServerResponse } from "http";

import { executeChain } from "@acme/chain";
import StreamingCallbackHandler from "@acme/chain/src/utils/callbacks";

import { type StrategyRequestBody } from "./types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.writeHead(200);
    res.flushHeaders();

    const bodyChunks = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks).toString();
    console.log(body);
    const { creationProps, goal, task } = JSON.parse(
      body,
    ) as StrategyRequestBody;

    // Uncomment the following line to use StreamingCallbackHandler if needed
    const callbacks = [new StreamingCallbackHandler(res)];
    creationProps.callbacks = callbacks;
    const result = await executeChain({
      creationProps,
      goal,
      task: task ? task : "",
    });

    console.debug("executePlan result", result);

    res.write(result);
    res.end();
  } catch (e) {
    let message;
    let status: number;
    let stack;
    if (e instanceof Error) {
      message = e.message;
      status = 500;
      stack = e.stack;
    } else {
      message = String(e);
      status = 500;
      stack = "";
    }

    const all = { stack, message, status };

    res.writeHead(status, { "Content-Type": "application/json" });
    res.write(JSON.stringify(all));
    res.end();
  }
};

export default handler;
