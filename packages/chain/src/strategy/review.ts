import { ConversationChain } from "langchain/chains";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
} from "langchain/memory";

import { extractTasks } from "~/utils/helpers";
import { createModel } from "~/utils/llm";
import { createPrompt } from "~/utils/prompts";
import { type ModelSettings } from "~/utils/types";
import { createMemory } from "./utils/memory";

export async function reviewChain(
  modelSettings: ModelSettings,
  goal: string,
  tasks: string[],
  lastTask: string,
  result: string,
  completedTasks: string[] | undefined,
) {
  const llm = createModel(modelSettings);
  const memory = await createMemory(goal, "task");
  const history =
    (memory instanceof MotorheadMemory && memory?.context) ||
    (memory instanceof ConversationSummaryMemory && memory?.chatHistory) ||
    (memory instanceof BufferMemory && memory?.chatHistory);

  const prompt = createPrompt("review");

  const chain = new ConversationChain({
    memory,
    prompt,
    llm,
  });
  const call = await chain.call({
    goal,
    tasks,
    lastTask,
    result,
    history,
    schema: "string[]",
  });
  console.debug(`about to call review chain}`);
  const completion = call?.response ? (call.response as string) : "";
  console.debug(`reviewAgent: ${completion}`);
  return extractTasks(completion, completedTasks ?? []);
}
