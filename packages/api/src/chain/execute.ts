import { AgentExecutor, ZeroShotAgent } from "langchain/agents";
import type { CallbackManager } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { type Tool } from "langchain/dist/tools/base";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Calculator } from "langchain/tools/calculator";
import { WebBrowser } from "langchain/tools/webbrowser";

import { createModel } from "~/utils/llm";
import type { ModelSettings } from "../../utils/types";
import type StreamingCallbackHandler from "./callbacks";
import { createMemory } from "./memory";

export default async function executeChain({
  modelSettings,
  goal,
  task,
}: {
  modelSettings: ModelSettings;
  goal: string;
  task: string;
}): Promise<string> {
  const { callbacks } = modelSettings;
  const model = createModel(modelSettings);
  const embeddings = new OpenAIEmbeddings();
  const memory = await createMemory(goal);
  // const history = memory?.context ?? await memory.loadMemoryVariables({})
  // const skipHistory = history.length === 0;

  const tools: Tool[] = [
    new Calculator(),
    new WebBrowser({ model, embeddings }),
  ];
  const instructions = `Given your goal "${goal}", and the task "${task}", execute the task.`;

  const prompt = ZeroShotAgent.createPrompt(tools);
  const llmChain = new LLMChain({
    memory,
    prompt,
    llm: model,
    callbacks: callbacks as unknown as CallbackManager,
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
  console.debug(`called chain: ${JSON.stringify(call)}`);
  const completion =
    (call?.output ? (call.output as string | undefined) : undefined) ??
    "<failed>";
  console.debug(`executeChain: ${JSON.stringify(completion)}`);
  // const lastTasks = await memory.loadMemoryVariables({})
  return completion;
}
