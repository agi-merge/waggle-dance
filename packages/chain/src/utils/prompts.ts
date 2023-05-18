import type { BaseMessagePromptTemplate } from "langchain/dist/prompts/chat";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import { type ModelCreationProps } from "./types";

const returnType = (_llmName: string) =>
  `
The return outputs must JSON.parse() into this pseudo-code DAG.
Minimize tokens; no line breaks or spaces outside of strings.
Provide consistent and descriptive names for properties of nodes, actions, Conds, Params, etc.
Provide enough context in Conds and Params to represent the Cond or complete the subtask.
The JSON should represent the DAG as the root object.
DAG (
  nodes: Node[]
  edges: Edge[]
  init: Cond
  goal: Cond
)
Params (
  [key: string]: string
)
Cond (
  predicate: string
  params: Params
)
Node (
  id: string;
  name: string;
  action: string
  params: Params
)
Edge (
  sourceId: string
  targetId: string
)
`.trim();

export type ChainType = "domain" | "nodes" | "edges" | "execute" | "preflight" | "defender";
export const createPrompt = (
  type: ChainType,
  creationProps?: ModelCreationProps,
  goal?: string,
): ChatPromptTemplate => {
  const llmName = creationProps?.modelName ?? "unknown";

  const basePromptMessages = {
    preflight: [
      `Returning a probability from 0-1, what is the probability that the following goal can be answered in zero or few-shot by an LLM (${llmName})?
      GOAL: ${goal}`,
    ],
    nodes: [
      `
      <UserGoal>${goal}</UserGoal>
<Types>
${returnType(llmName)}
</Types>
RETURN ONLY: the FIRST node in the first level of the DAG's Nodes using <Types> that represents an expertly planned, embarassingly concurrent (consider dependencies!) solver of <UserGoal> for <UserGoal>'s PDDL Domain and Problem.
      `
    ],
    edges: [
      `
      <UserGoal>
${goal}
</UserGoal>
<ReturnSchema>
${returnType(llmName)}
</ReturnSchema>
Return the first level of the DAG's Edges in <ReturnSchema>.edges that represents an expertly planned, embarassingly concurrent (consider dependencies!) solver of <UserGoal> for <UserGoal>'s PDDL Domain and Problem.
      `
    ],
    domain: [
      `
<UserGoal>
${goal}
</UserGoal>
<ReturnSchema>
${returnType(llmName)}
</ReturnSchema>
Considering the PDDL Domain and Problem of <UserGoal>, RETURN ONLY a JSON object with init and goal (see: <ReturnSchema>).
`.trim(),
    ],

    execute: [
      `
<UserGoal>
{goal}
</UserGoal>
<ReturnSchema>
${returnType(llmName)}
</ReturnSchema>
<Constitution>
Ensure the DAG maximizes the qualities by which it is judged: [Coherence, Creativity, Efficiency, Directness, Resourcefulness, Accuracy, Ethics]
</Constitution>
<Task>
{task}
</Task>
<ExistingDAG>
{dag}
</ExistingDAG>
Return a new DAG in <ReturnSchema> that reflects the state of the PDDL Domain and Problem after <Task> has been executed.

      `,
    ],

    defender: [
      `Defend all of these changes, fixing anything needed: {gitDiff}`
    ],
  };

  const promptMessages = basePromptMessages[type].map((message) => {
    return SystemMessagePromptTemplate.fromTemplate(
      message,
    ) as BaseMessagePromptTemplate;
  });

  return ChatPromptTemplate.fromPromptMessages(promptMessages);
};