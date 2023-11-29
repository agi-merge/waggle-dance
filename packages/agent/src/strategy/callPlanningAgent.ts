// agent/strategy/callPlanningAgent.ts

import {
  encodingForModel
  
  
} from "js-tiktoken";
import type {Tiktoken, TiktokenModel} from "js-tiktoken";
import { LLMChain } from "langchain/chains";
import type {JsonObject} from "langchain/tools";
import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

import { defaultAgentSettings, rootPlanId  } from "../..";
import type {PlanWireFormat} from "../..";
import {
  createPlanFormattingPrompt,
  createPlanPrompt,
} from "../prompts/createPlanPrompt";
import {
  AgentPromptingMethod,
  LLM,
  LLM_ALIASES,
  ModelStyle,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import type {ModelCreationProps} from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

export async function callPlanningAgent(
  creationProps: ModelCreationProps,
  goalPrompt: string,
  goalId: string,
  signal: AbortSignal,
  namespace: string,
  agentProtocolOpenAPISpec?: JsonObject,
  returnType: "YAML" | "JSON" = "YAML",
): Promise<string | Error> {
  const tags = [
    "plan",
    goalId,
    ...(creationProps.modelName ? [creationProps.modelName] : []),
  ];
  const llm = createModel(creationProps, ModelStyle.Chat); // chat is required for system prompt

  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const skills = createSkills(
    llm,
    embeddings,
    AgentPromptingMethod.ChatConversationalReAct,
    false,
    rootPlanId,
    returnType,
    agentProtocolOpenAPISpec,
  );
  const prompt = createPlanPrompt({
    goalPrompt,
    goalId,
    returnType,
    tools: skills,
  });
  const createPlanChain = new LLMChain({
    // memory,
    prompt,
    tags,
    llm,
  });

  // const formattingLLM = createModel(
  //   { ...creationProps, modelName: LLM_ALIASES["fast-large"], maxTokens: -1 },
  //   AgentPromptingMethod.OpenAIStructuredChat,
  // ); // this is used to select a chat model (required for system message prompt)]

  // const formattingChain = ConstitutionalChain.fromLLM(formattingLLM, {
  //   chain: createPlanChain,
  //   constitutionalPrinciples: [principle],
  // });

  try {
    const [call] = await Promise.all([
      // prompt.format({ goal, schema: "string[]" }),
      createPlanChain.call({
        signal,
        tags,
      }),
    ]);

    const error = {
      type: "error",
      severity: "fatal",
      message: "no response from callPlanningAgent",
    };
    const stringError =
      returnType === "JSON" ? jsonStringify(error) : yamlStringify(error);
    const response = call?.response
      ? (call.response as string)
      : call?.text
      ? (call.text as string)
      : stringError;

    try {
      const parsedDAG =
        returnType === "JSON"
          ? jsonParse(removeEnclosingMarkdown(response))
          : (yamlParse(removeEnclosingMarkdown(response)) as
              | PlanWireFormat
              | null
              | undefined);

      return parsedDAG ? response : stringError;
    } catch (error) {
      console.error("error parsing dag", error);
      const formattingPrompt = createPlanFormattingPrompt(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await createPlanChain.prompt.lc_kwargs.content,
        response,
        returnType,
      );

      const matchResponseTokensWithMinimumAndPadding = (
        text: string,
        encoder: Tiktoken,
        paddingMultiplier = 1.1,
      ) => {
        if (paddingMultiplier <= 1) {
          throw new Error("paddingMultiplier must be greater than 1");
        }
        const max = defaultAgentSettings.plan.maxTokens;
        const tokenCount = encoder.encode(text).length;
        if (response.length > 0.9 * max) {
          // if the response is close to max, it probably means that the reason parsing failed is bc the plan is VERY long.
          // Allow it to use as many tokens as the model will allow!
          return -1;
        } else {
          // otherwise, we want to use the response token count with some padding for the fix (it should be close, yeah?)
          return Math.round(tokenCount * paddingMultiplier);
        }
      };

      const modelName = LLM_ALIASES["smart-xlarge"];
      let encoding: Tiktoken;
      try {
        encoding = encodingForModel(modelName as TiktokenModel);
      } catch (error) {
        console.error(
          `Error encoding model: ${
            (error as Error).message
          }. Falling back to "gpt-4".`,
        );
        encoding = encodingForModel("gpt-4");
      }
      const formattingLLM = createModel(
        {
          ...creationProps,
          modelName,
          maxTokens: matchResponseTokensWithMinimumAndPadding(
            response,
            encoding,
          ),
        },
        ModelStyle.Chat,
      );
      tags.push("fix");
      const formattingChain = new LLMChain({
        prompt: formattingPrompt,
        tags,
        llm: formattingLLM,
      });

      const [call] = await Promise.all([
        // prompt.format({ goal, schema: "string[]" }),
        formattingChain.call({
          signal,
          tags,
        }),
      ]);

      const dag = call?.response
        ? (call.response as string)
        : call?.text
        ? (call.text as string)
        : stringError;

      return dag;
    }
  } catch (error) {
    return error as Error;
  }
}

// replace the first instance of ```yaml and ```json (or ```anything) with empty, as well as the last instance of ```
export function removeEnclosingMarkdown(tokens: string): string {
  const markdownStart = tokens.indexOf("```");
  const markdownEnd = tokens.lastIndexOf("```");

  if (
    markdownStart !== -1 &&
    markdownEnd !== -1 &&
    markdownStart !== markdownEnd
  ) {
    const newlineAfterMarkdownStart = tokens.indexOf("\n", markdownStart);
    if (newlineAfterMarkdownStart !== -1) {
      return tokens.slice(newlineAfterMarkdownStart + 1, markdownEnd).trim();
    }
  }

  return tokens;
}
