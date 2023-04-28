/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import axios from "axios";

import { reviewChain } from "@acme/chain";

import { StrategyRequestBody } from "./types";

export const config = {
  runtime: "edge",
};

const handler = async (
  req: {
    body: any;
    json: () => StrategyRequestBody | PromiseLike<StrategyRequestBody>;
  },
  res: {
    status: (arg0: number) => {
      (): any;
      new (): any;
      json: {
        (arg0: {
          newTasks?: any;
          stack?: string | undefined;
          message?: string;
          status?: number;
        }): void;
        new (): any;
      };
    };
  },
) => {
  try {
    const { modelSettings, goal, tasks, lastTask, result, completedTasks } =
      config.runtime == "nodejs"
        ? (JSON.parse(JSON.stringify(req.body)) as StrategyRequestBody)
        : ((await req.json()) as StrategyRequestBody);

    if (tasks === undefined || lastTask === undefined || result === undefined) {
      return;
    }

    const newTasks = await reviewChain(
      modelSettings,
      goal,
      tasks,
      lastTask,
      result,
      completedTasks,
    );

    res.status(200).json({ newTasks });
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
    console.log(all);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return res.status(status).json(all);
  }
};

export default handler;
