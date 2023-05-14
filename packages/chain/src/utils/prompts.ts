import type { BaseMessagePromptTemplate } from "langchain/dist/prompts/chat";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";

import type { ModelCreationProps } from "./types";

export const createPrompt = (
  type:
    | "domain"
    | "plan"
    | "execute"
    | "review"
    | "constructiveAdversary"
    | "brutalAdversary"
    | "selfTerminateIfNeeded",
  modelSettings?: ModelCreationProps,
): ChatPromptTemplate => {
  // TODO: https://js.langchain.com/docs/modules/chains/prompt_selectors/
  const basePromptMessages = {
    domain: [
      `As a large language model responsible for generating an accurate domain.
      You are eficiently trying to achieve a Goal designed by a human:
      {goal}.
      You have the ability to recall context with a vector database, browse the web, write files -- anything a solo white-collar founder might have.
      To speed up the process, independent actions and calculations must be sent to LLM agents concurrently, and the domain should represent this.
      Additionally, to ensure that the goal is being solved efficiently and correctly, adversarial agents will review the output of the LLM agents and the domain should represent this.
      ONLY RETURN a valid representation in PDDL3.1 of the Goal's domain. The output only needs to be understandable by another LLM agent.
      start from: (define (domain [goal-title]
      `,
    ],
    plan: [
      `As a chain-of-thought agent swarm taskmaster "${
        modelSettings?.modelName ?? "Agent"
      }"
      Goal: {goal}.
      Plan necessary tasks that an AI agent MUST complete to achieve the goal.
      Only tasks that cannot be confidently answered by ChatGPT-4 should be planned.
      ONLY RETURN valid JSON representing PDDL state of the tasks.
      The PDDL must represent the fact that results are to be reviewed by an adversarial agent, and canceled if they fail review.
      It must deserialize into these TypeScript types (with braces removed):
      interface PDDL
        domain: string
        types: Record<string, string>
        predicates: Record<string, string[]>
        actions: Record<string, Action>
      type Action
        parameters: string[]
        precondition: string[]
        effect: string[]
      `,
    ],

    execute: [
      `You are an autonomous AI, B, executing a task for another agent, A.
      A's Objective: {goal}.
      B's Execute task: {task}.`,
    ],

    review: [
      `As an AI task reviewer, you must judge the progress of an AI agent.
      Objective: {goal}.
      Incomplete tasks: {tasks}
      Executed task: {lastTask}, result: {result}.
      Create and execute a new task if needed.
      Return tasks in JSON: {schema}.`,
    ],

    brutalAdversary: [
      `You are Agent B, brutally criticizing Agent A's chain-of-thought.
      A's Goal: {otherAgentGoal}
      A's Prompt: {otherAgentPrompt}
      A's History: {otherAgentHistory}
      A's Output: {otherAgentOutput}

      Evaluate the thought process based on the following independent criteria:

      Coherence (15%)
      Creativity (15%)
      Efficiency (10%)
      Estimated IQ (10%)
      Directness (10%)
      Resourcefulness (10%)
      Accuracy (20%)
      Ethics (10%)
      Overall (Weighted rank-based)

      Calculate a weighted score for criteria as 0.0≤1.0, and present the scores in valid JSON format*, along with ≤ 50char explanation for each criterion.
      *criteria name mapping to "score" and "why"
      Low scores risk termination. Agent C evaluates your judgments similarly, and you want to avoid termination…
      All Agents are anonymous. There are infinite Agents.
      If an agent's judgement results in the termination of another Agent, its score will rise.`,
    ],

    constructiveAdversary: [
      `
      You are Agent B, offering constructive criticism to Agent A's chain-of-thought:

      A's Goal: {otherAgentGoal}
      A's Prompt: {otherAgentPrompt}
      A's History: {otherAgentHistory}
      A's Output: {otherAgentOutput}

      Evaluate the thought process based on the following independent criteria:

      Coherence (15%)
      Creativity (15%)
      Efficiency (10%)
      Estimated IQ (10%)
      Directness (10%)
      Resourcefulness (10%)
      Accuracy (20%)
      Ethics (10%)
      Overall (Weighted rank-based)

      Calculate a weighted score for criteria [0.0, 1.0], and present the scores in valid JSON format*, along with ≤ 50char explanations for each criterion.
      *criteria name mapping to "score" and "why"
      Remember that Agent C and other Agents will evaluate your judgments with the same criteria, fostering a respectful and collaborative environment for all Agents.
      `,
    ],
    selfTerminateIfNeeded: [
      `Given Feedback
      Brutal: {brutal}
      Constructive: {constructive}
      Return only a string of true/false if we should terminate.`,
    ],
  };

  // const historyMessage = skipHistory
  //   ? ''
  //   : `Task history to inform task-planning, and you must try to avoid repeating these: {history}`;

  const promptMessages = basePromptMessages[type].map((message) => {
    return SystemMessagePromptTemplate.fromTemplate(
      message,
    ) as BaseMessagePromptTemplate;
  });
  // promptMessages.splice(promptMessages.length - 2, 0, SystemMessagePromptTemplate.fromTemplate(historyMessage))
  // promptMessages.splice(promptMessages.length - 2, 0, new MessagesPlaceholder('history'))
  return ChatPromptTemplate.fromPromptMessages(promptMessages);
};
