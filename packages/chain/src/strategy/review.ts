import { ConversationChain } from "langchain/chains";
import {
  BufferMemory,
  ConversationSummaryMemory,
  MotorheadMemory,
} from "langchain/memory";

import { createMemory } from "../utils/memory";
import { createModel } from "../utils/model";
import { createPrompt } from "../utils/prompts";
import { extractTasks } from "../utils/serialization";
import { ModelCreationProps } from "../utils/types";

export async function reviewChain(
  creationProps: ModelCreationProps,
  goal: string,
  tasks: string[],
  lastTask: string,
  result: string,
  completedTasks: string[] | undefined,
) {
  const llm = createModel(creationProps);
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
