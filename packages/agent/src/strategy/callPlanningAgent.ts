// agent/strategy/callPlanningAgent.ts

import { encodingForModel, type Tiktoken } from "js-tiktoken";
import { LLMChain } from "langchain/chains";
import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

import { defaultAgentSettings, rootPlanId, type PlanWireFormat } from "../..";
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
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

export async function callPlanningAgent(
  creationProps: ModelCreationProps,
  goalPrompt: string,
  goalId: string,
  signal: AbortSignal,
  namespace: string,
  returnType: "YAML" | "JSON" = "YAML",
): Promise<string | Error> {
  const tags = [
    "plan",
    goalId,
    ...(creationProps.modelName ? [creationProps.modelName] : []),
  ];
  const agentPromptingMethod = AgentPromptingMethod.ChatConversationalReAct; // this is used to select a chat model (required for system message prompt)
  const llm = createModel(creationProps, agentPromptingMethod);

  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const skills = createSkills(
    llm,
    embeddings,
    agentPromptingMethod,
    false,
    rootPlanId,
    returnType,
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
          ? jsonParse(response)
          : (yamlParse(response) as PlanWireFormat | null | undefined);

      return parsedDAG ? response : stringError;
    } catch (error) {
      console.error("error parsing dag", error);
      const formattingPrompt = createPlanFormattingPrompt(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await createPlanChain.prompt.lc_kwargs["content"],
        response,
        returnType,
      );

      const matchResponseTokensWithMinimumAndPadding = (
        text: string,
        encoder: Tiktoken,
        paddingMultiplier: number = 1.1,
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
          return tokenCount * paddingMultiplier;
        }
      };

      const modelName = LLM_ALIASES["fast-large"];
      const formattingLLM = createModel(
        {
          ...creationProps,
          modelName,
          maxTokens: matchResponseTokensWithMinimumAndPadding(
            response,
            encodingForModel(modelName),
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
