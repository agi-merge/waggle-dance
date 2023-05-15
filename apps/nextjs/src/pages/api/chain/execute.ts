import { type IncomingMessage, type ServerResponse } from "http";

import { executeChain } from "@acme/chain";
import StreamingCallbackHandler from "@acme/chain/src/utils/callbacks";

import { type ExecuteRequestBody } from "./types";

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

const handler = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Transfer-Encoding": "chunked",
    });

    const bodyChunks = [];
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
    const body = Buffer.concat(bodyChunks).toString();
    console.log(body);
    const {
      creationProps,
      goal,
      tasks,
      completedTasks: _completedTasks,
    } = JSON.parse(body) as ExecuteRequestBody;

    // Uncomment the following line to use StreamingCallbackHandler if needed
    const callbacks = [new StreamingCallbackHandler(res)];
    creationProps.callbacks = callbacks;
    console.log("about to execute plan");
    const executionPromises = tasks.map(async (task) => {
      return await executeChain({
        creationProps,
        goal,
        task: task.id,
      });
    });
    const executionResults = Promise.all(executionPromises);

    console.debug("executePlan results", executionResults);

    res.write(executionPromises);
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
