/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { type ServerResponse } from "http";
import axios from "axios";

import StreamingCallbackHandler from "~/server/chains/callbacks";
import executeChain from "../../../server/chains/execute";
import type { RequestBody } from "../../../utils/interfaces";

export const config = {
  runtime: "nodejs",
};

const handler = async (req, res: ServerResponse) => {
  try {
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();
    const { modelSettings, goal, task } =
      config.runtime == "nodejs"
        ? (JSON.parse(JSON.stringify(req.body)) as RequestBody)
        : ((await req.json()) as RequestBody);
    Object.assign(modelSettings, {
      callbacks: new StreamingCallbackHandler(res),
    });
    const result = await executeChain({
      modelSettings,
      goal,
      task: task ? task : "",
    });
    console.debug("executePlan result", result);
    res.write(JSON.stringify(result));
    return res.end();
    // res.status(200).json({ result });
  } catch (e) {
    let message;
    let status: number;
    let stack;
    if (e instanceof Error) {
      message = e.message;
      if (axios.isAxiosError(e)) {
        status = e.response?.status ?? 500;
      } else {
        status = 500;
      }
      stack = e.stack;
    } else {
      message = String(e);
      status = 500;
      stack = "";
    }

    const all = { stack, message, status };

    if (!res.headersSent) {
      res.setHeader("Status", status);
      res.write(JSON.stringify(all));
      return res.end();
    } else {
      const errorMessage = JSON.stringify({ error: all });
      res.write(`\n${errorMessage}`);
      return res.end();
    }
  }
};

export default handler;
