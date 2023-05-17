// strategy/execute.ts

import { AgentExecutor, ChatAgent } from "langchain/agents";
import { LLMChain } from "langchain/chains";
import { type Tool } from "langchain/dist/tools/base";
import {
  ChainStepExecutor,
  LLMPlanner,
  PlanAndExecuteAgentExecutor,
  PlanOutputParser,
} from "langchain/experimental/plan_and_execute";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import { createMemory } from "../utils/memory";
import { createEmbeddings, createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export const PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE = [
  `Let's first understand the problem and devise a plan to solve the problem.`,
  `Please output the plan starting with the header "Plan:"`,
  `and then followed by a numbered list of steps.`,
  `Please make the plan the minimum number of steps required`,
  `to answer the query or complete the task accurately and precisely.`,
  `Your steps should be general, and should not require a specific method to solve a step. If the task is a question,`,
  `the final step in the plan must be the following: "Given the above steps taken,`,
  `please respond to the original query."`,
  `At the end of your plan, say "<END_OF_PLAN>"`,
].join(" ");
export const PLANNER_CHAT_PROMPT =
  /* #__PURE__ */ ChatPromptTemplate.fromPromptMessages([
    /* #__PURE__ */ SystemMessagePromptTemplate.fromTemplate(
      PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE,
    ),
    /* #__PURE__ */ HumanMessagePromptTemplate.fromTemplate(`{input}`),
  ]);
export const DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE = `Previous steps: {previous_steps}

Current objective: {current_step}

{agent_scratchpad}

You may extract and combine relevant data from your previous steps when responding to me.`;

export async function executeChain({
  creationProps,
  goal,
  task,
}: {
  creationProps: ModelCreationProps;
  goal: string;
  task: string;
}): Promise<string> {
  const model = createModel(creationProps);
  const embeddings = createEmbeddings(creationProps);
  const memory = await createMemory(goal);
  // const history = memory?.context ?? await memory.loadMemoryVariables({})
  // const skipHistory = history.length === 0;

  const tools: Tool[] = [new WebBrowser({ model, embeddings })];
  if (process.env.SERPAPI_API_KEY?.length) {
    tools.push(
      new SerpAPI(process.env.SERPAPI_API_KEY, {
        location: "Los Angeles,California,United States",
        hl: "en",
        gl: "us",
      }),
    );
  }

  // const instructions = `Given your goal "${goal}", and the task "${task}", execute the task.`;
  const exe = createPrompt("execute", creationProps, goal);
  const text = await exe.format({ goal, task });
  // const prompt = ZeroShotAgent.createPrompt(tools);
  // const llmChain = new LLMChain({
  //   memory,
  //   prompt,
  //   llm: model,
  //   // callbacks: callbacks as unknown as CallbackManager,
  // });
  // const agent = new ZeroShotAgent({
  //   llmChain,
  //   allowedTools: tools.map((tool) => tool.name),
  // });

  // const singleAgent = new LLMSingleActionAgent({ llmChain, tools })

  // const executorConfig = {
  //   agent,
  //   tools,
  //   memory,
  //   streaming: true,
  //   returnIntermediateSteps: false,
  //   callbacks,
  // } as AgentExecutorInput;
  const plannerLlmChain = new LLMChain({
    llm: model,
    memory,
    prompt: PLANNER_CHAT_PROMPT,
  });
  const planner = new LLMPlanner(plannerLlmChain, new PlanOutputParser());
  const agent = ChatAgent.fromLLMAndTools(model, tools, {
    humanMessageTemplate: text,
  });
  const stepExecutor = new ChainStepExecutor(
    AgentExecutor.fromAgentAndTools({
      agent,
      memory,
      tools,
    }),
  );
  const executor = new PlanAndExecuteAgentExecutor({
    planner,
    stepExecutor,
  });
  // const executorConfig = {
  //   llm: model,
  //   tools,
  //   humanMessageTemplate: text,
  // };
  // const executor = PlanAndExecuteAgentExecutor.fromLLMAndTools(executorConfig);
  console.debug(`about to call execute chain`);
  const call = await executor.call({ text });
  console.debug(`called chain: ${JSON.stringify(call)}`);
  const completion =
    (call?.output ? (call.output as string | undefined) : undefined) ??
    "<failed>";
  console.debug(`executeChain: ${JSON.stringify(completion)}`);
  // const lastTasks = await memory.loadMemoryVariables({})
  return completion;
}
