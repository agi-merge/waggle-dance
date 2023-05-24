// api/chain/execute.ts

import { type ExecuteRequestBody } from "./types";
import { type NextRequest } from "next/server";
import { executeChain } from "@acme/chain";
import { stringify } from "yaml"

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "edge",
};

const handler = async (req: NextRequest) => {
  const nodeId = "👸"; // maybe goal.slice(0, 5)

  try {
    const {
      creationProps,
      goal,
      tasks,
      dag,
    } = await req.json() as ExecuteRequestBody;
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const inlineCallback = {
          handleLLMNewToken(token: string) {
            controller.enqueue(encoder.encode(token));
          },
        };

        const callbacks = [inlineCallback];
        creationProps.callbacks = callbacks;
        const promises = tasks.map(async (task) => {
          console.log("about to executeChain", task.id);
          return await executeChain(
            creationProps, goal, stringify(task), stringify(dag));
        })

        const _results = await Promise.all(promises)
        console.log("results", _results);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Transfer-Encoding": "chunked",
      },
    });

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
    console.error(all);
    const errorPacket = { type: "error", nodeId, severity: "fatal", message: JSON.stringify(all) };
    return new Response(JSON.stringify(errorPacket), {
      headers: {
        "Content-Type": "application/json",
      },
      status,
    })
  }
};

export default handler;
// import { type IncomingMessage, type ServerResponse } from "http";


// import { type ExecuteRequestBody } from "./types";

// export const config = {
//   api: {
//     bodyParser: false,
//   },
//   runtime: "nodejs",
// };

// const handler = async (req: IncomingMessage, res: ServerResponse) => {
//   const writePacket = (packet: ChainPacket) => {
//     res.write(JSON.stringify(packet) + "\n");
//   };
//   try {
//     res.writeHead(200, {
//       "Content-Type": "application/octet-stream",
//       "Transfer-Encoding": "chunked",
//     });

//     const bodyChunks = [];
//     for await (const chunk of req) {
//       bodyChunks.push(chunk);
//     }
//     const body = Buffer.concat(bodyChunks).toString();
//     const {
//       creationProps,
//       goal,
//       tasks,
//       dags,
//     } = JSON.parse(body) as ExecuteRequestBody;


//     console.log("about to execute tasks");
//     // TODO: send all to one chain? fixes concurrency issue but may reduce overall perf due to waiting for all instead of maybe proceeding to next DAG level
//     const executionPromises = tasks.map((task, idx) => {
//       const dag = dags[idx];
//       // const nodeId = task.id
//       const inlineCallback = {
//         handleLLMNewToken(token: string) {
//           // console.debug("handleLLMNewToken", { token });
//           res.write(token);
//         },
//         // handleLLMStart: (llm: { name: string }, _prompts: string[]) => {
//         //   console.debug("handleLLMStart", { llm });
//         //   writePacket({ type: "handleLLMStart", nodeId, llm });
//         // },
//         // handleChainStart: (chain: { name: string }) => {
//         //   console.debug("handleChainStart", { chain });
//         //   writePacket({ type: "handleChainStart", nodeId, chain });
//         // },
//         // handleAgentAction: (action: AgentAction) => {
//         //   console.debug("handleAgentAction", action);
//         //   writePacket({ type: "handleAgentAction", nodeId, action });
//         // },
//         // handleToolStart: (tool: { name: string }) => {
//         //   console.debug("handleToolStart", { tool });
//         //   writePacket({ type: "handleToolStart", nodeId, tool });
//         // },
//       };
//       creationProps.callbacks = [inlineCallback];
//       return executeChain({
//         creationProps,
//         goal,
//         task,
//         dag,
//       });


//     });
//     const executionResults = await Promise.allSettled(executionPromises);

//     // console.debug("executePlan results", executionResults);
//     res.write(JSON.stringify({ results: executionResults }));
//   } catch (e) {
//     let message;
//     let status: number;
//     let stack;
//     if (e instanceof Error) {
//       message = e.message;
//       status = 500;
//       stack = e.stack;
//     } else {
//       message = String(e);
//       status = 500;
//       stack = "";
//     }

//     const all = { stack, message, status };
//     console.error(all);
//     writePacket({ type: "error", nodeId: "2", severity: "fatal", message: JSON.stringify(all) });
//   } finally {
//     res.end();
//   }
// };

// export default handler;
