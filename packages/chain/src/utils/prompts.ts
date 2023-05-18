import type { BaseMessagePromptTemplate } from "langchain/dist/prompts/chat";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import { type ModelCreationProps } from "./types";

const returnType = (_llmName: string) =>
  `
The return output will need to successfully MessagePack msgpack.decode() into this MessagePack definition of the DAG.
Maximize the width of the DAG when possible, minimize the depth.
Provide consistent and descriptive names for properties of nodes, actions, Conds, Params, etc.
Provide enough context in Conds and Params to represent the Cond or complete the subtask.
Refrain from adding any other prose other than the MessagePack output.
The MessagePack (NOT JSON) !!REMEBER MESSAGEPACK!! should represent the DAG as the root object.
interface DAG (
  nodes: Node[]
  edges: Edge[]
  init: Cond
  goal: Cond
)
interface Params (
  [key: string]: string
)
interface Cond (
  predicate: string
  params: Params
)
interface Node (
  id: string;
  name: string;
  action: string
  params: Params
)
interface Edge (
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
      `<UserGoal>${goal}</UserGoal>
      <Schema>${returnType(llmName)}</Schema>
      <Task>
        As a project manager employed by the User to solve <UserGoal />, construct a DAG that could serve as a concurrent execution graph for your large and experienced team for <UserGoal />.
      </Task>
      <Return>ONLY the DAG as described in <Schema /> to be MessagePack (msgpack) decoded.</Return>
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