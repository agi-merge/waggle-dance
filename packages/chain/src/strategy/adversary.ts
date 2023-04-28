// const judgementInput = {
//   otherAgentGoal: goal,
//   otherAgentPrompt,
//   otherAgentHistory: history,
//   otherAgentOutput: completion
// };
// spinner.start('Running adversarial simulacrum…');
// const [brutal, constructive] = await Promise.all([
//   judgement("brutalAdversary", llm, judgementInput),
//   judgement("constructiveAdversary", llm, judgementInput),
// ])
// spinner.stop();

import { ConversationChain } from "langchain/chains";
import type { BaseLLM } from "langchain/llms/base";

// const selfTerminateIfNeededPrompt = createPrompt("selfTerminateIfNeeded")//.format({ brutal, constructive })
// const chain2 = new ConversationChain({
//   // memory,
//   prompt: selfTerminateIfNeededPrompt,
//   llm,
// });
// spinner.start('Adversarial termination?');
// const selfTerminate = await chain2.call({ brutal, constructive })

// console.debug("selfTerminate", selfTerminate)
// if (selfTerminate === 'true') {
//   return []
// }

type AdversaryInput = {
  otherAgentGoal: string;
  otherAgentPrompt: string;
  otherAgentHistory: string | undefined;
  otherAgentOutput: string;
};
export default async function judgement(
  persona: "constructiveAdversary" | "brutalAdversary",
  llm: BaseLLM,
  adversaryInput: AdversaryInput,
) {
  const prompt = createPrompt(persona);

  // we want to use the history of the other agents, not our own.
  // inject it in the prompt from adversaryInput param instead of in the LLMChain
  const chain = new ConversationChain({
    llm,
    prompt,
  });

  const call = await chain.call({
    ...adversaryInput,
    ...{ score: 0.1, otherAgentScore: 0.2 },
  });
  const completion = call?.response ? (call.response as string) : "";
  console.log(`${persona} judgement: ${completion}`);
  return completion;
}
