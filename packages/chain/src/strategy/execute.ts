import { AgentExecutor, ZeroShotAgent } from "langchain/agents";
import type { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { type Tool } from "langchain/dist/tools/base";
import { SerpAPI } from "langchain/tools";
import { WebBrowser } from "langchain/tools/webbrowser";

import { createMemory } from "../utils/memory";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/types";

export async function executeChain({
  creationProps,
  goal,
  task,
}: {
  creationProps: ModelCreationProps;
  goal: string;
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
  const instructions = `Given your goal "${goal}", and the task "${task}", execute the task.`;

  const prompt = ZeroShotAgent.createPrompt(tools);
  const llmChain = new LLMChain({
    memory,
    prompt,
    llm: model,
    // callbacks: callbacks as unknown as CallbackManager,
  });
  const agent = new ZeroShotAgent({
    llmChain,
    allowedTools: tools.map((tool) => tool.name),
    // outputParser: new ZeroShotAgentOutputParser({}),
  });

  // const singleAgent = new LLMSingleActionAgent({ llmChain, tools })

  const executorConfig = {
    agent,
    tools,
    memory,
    streaming: true,
    returnIntermediateSteps: false,
    callbackManager: callbacks as unknown as CallbackManager,
  };
  const executor = AgentExecutor.fromAgentAndTools(executorConfig);
  console.debug(`about to call execute chain`);
  const call = await executor.call({ input: instructions });
  // console.debug(`called chain: ${JSON.stringify(call)}`);
  const completion =
    (call?.output ? (call.output as string | undefined) : undefined) ??
    "<failed>";
  // console.debug(`executeChain: ${JSON.stringify(completion)}`);
  // const lastTasks = await memory.loadMemoryVariables({})
  return completion;
}
