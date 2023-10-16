// api/agent/result.ts

import { type NextRequest } from "next/server";
import { parse } from "superjson";
import { stringify } from "yaml";

import {
  LLM_ALIASES,
  Temperature,
  TEMPERATURE_VALUES,
} from "@acme/agent/src/utils/llms";

import { env } from "~/env.mjs";
import { type RefineRequestBody } from "~/features/WaggleDance/types/types";
import {
  callRefiningAgent,
  type AgentPacket,
  type ModelCreationProps,
} from "../../../../../../packages/agent";

export const config = {
  api: {
    bodyParser: true,
  },
  runtime: "edge",
};

export type CreateRefineParams = {
  prompt: string;
};

// data proxy for edge
export default async function RefineStream(req: NextRequest) {
  const abortController = new AbortController();
  let refineResult: string | undefined;
  try {
    // for some reason, since we request this using trpc/undici, we need to await text and parse it manually into json.
    // this may be why: https://undici.nodejs.org/#/?id=body-mixins
    const text = await req.text();
    const { goalPrompt }: RefineRequestBody = parse(text);

    const creationProps: ModelCreationProps = {
      modelName: LLM_ALIASES["fast"],
      temperature: TEMPERATURE_VALUES[Temperature.Stable],
      maxTokens: 350,
      streaming: true,
      basePath: env.NEXT_PUBLIC_LANGCHAIN_API_URL,
      verbose: env.NEXT_PUBLIC_LANGCHAIN_VERBOSE === "true",
    };
    // const session = await getServerSession({ req, res });

    // const encoder = new TextEncoder();
    // const stream = new ReadableStream({
    // async start(controller) {
    //   const inlineCallback = {
    //     handleLLMNewToken(token: string) {
    //       const packet: AgentPacket = { type: "token", token };
    //       controller.enqueue(encoder.encode(stringify([packet])));
    //     },

    //     handleChainError(
    //       err: unknown,
    //       _runId: string,
    //       _parentRunId?: string,
    //     ) {
    //       let errorMessage = "";
    //       if (err instanceof Error) {
    //         errorMessage = err.message;
    //       } else {
    //         errorMessage = stringify(err);
    //       }
    //       const packet: AgentPacket = {
    //         type: "handleChainError",
    //         err: errorMessage,
    //       };
    //       controller.enqueue(encoder.encode(stringify([packet])));
    //       console.debug("handleChainError", packet);
    //     },

    //     handleLLMError(
    //       err: unknown,
    //       _runId: string,
    //       _parentRunId?: string | undefined,
    //     ): void | Promise<void> {
    //       let errorMessage = "";
    //       if (err instanceof Error) {
    //         errorMessage = err.message;
    //       } else {
    //         errorMessage = stringify(err);
    //       }
    //       const packet: AgentPacket = {
    //         type: "handleLLMError",
    //         err: errorMessage,
    //       };
    //       controller.enqueue(encoder.encode(stringify([packet])));
    //       console.debug("handleLLMError", packet);
    //     },
    //   };

    //   const callbacks = [inlineCallback];
    //   creationProps.callbacks = callbacks;
    //   console.debug("about to refineChain");

    //   refineResult = await callRefiningAgent({
    //     creationProps,
    //     goal,
    //     signal: abortController.signal,
    //   });

    //   console.debug("refine result", refineResult);
    //   controller.close();
    //   resolveStreamEnded();
    // },

    //   cancel() {
    //     abortController.abort();
    //     console.warn("cancel refine request");
    //     rejectStreamEnded("Stream cancelled");
    //   },
    // });
    const contentType = "application/yaml";

    refineResult = await callRefiningAgent({
      creationProps,
      goalPrompt,
      signal: abortController.signal,
      contentType,
    });

    console.debug("refine result", refineResult);

    return new Response(refineResult, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (e) {
    let errorPacket: AgentPacket;
    if (e as AgentPacket) {
      errorPacket = e as AgentPacket;
    } else if (typeof e === "string") {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: e,
      };
    } else {
      errorPacket = {
        type: "error",
        severity: "fatal",
        error: String(e),
      };
    }
    console.error("plan error", e);

    let status = 500;
    if (e as { status: number }) {
      status = (e as { status: number }).status;
    }

    return new Response(stringify([errorPacket]), {
      headers: {
        "Content-Type": "application/yaml",
      },
      status,
    });
  } finally {
    abortController.abort();
    // wrap this because otherwise streaming is broken due to finally being run, and awaiting, before the return stream.
    // void (async () => {
    //   await streamEndedPromise;
    // })();
  }
}
