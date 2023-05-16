// strategy/execute.ts

import { ZeroShotAgent, type AgentExecutorInput } from "langchain/agents";
import { LLMChain } from "langchain/chains";
import { type Tool } from "langchain/dist/tools/base";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import { createMemory } from "../utils/memory";
import { createEmbeddings, createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { type ModelCreationProps } from "../utils/types";

export async function executeChain({
  creationProps,
  goal,
  domain,
  problem,
  task,
}: {
  creationProps: ModelCreationProps;
  goal: string;
  domain: string;
  problem: string;
  task: string;
}): Promise<string> {
  const { callbacks } = creationProps;
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
  const input = await exe.format({ goal, domain, problem, task });
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
  const executorConfig = {
    llm: model,
    tools,
    humanMessageTemplate: input,
  };
  const executor = PlanAndExecuteAgentExecutor.fromLLMAndTools(executorConfig);
  console.debug(`about to call execute chain`);
  const call = await executor.call({ input });
  console.debug(`called chain: ${JSON.stringify(call)}`);
  const completion =
    (call?.output ? (call.output as string | undefined) : undefined) ??
    "<failed>";
  console.debug(`executeChain: ${JSON.stringify(completion)}`);
  // const lastTasks = await memory.loadMemoryVariables({})
  return completion;
}
