import { type ZeroShotCreatePromptArgs } from "langchain/agents";
import { createOpenApiAgent, OpenApiToolkit } from "langchain/agents/toolkits";
import { type BaseLanguageModel } from "langchain/base_language";
import { type OpenAPIChainOptions } from "langchain/chains";
import { type JsonSpec } from "langchain/tools";

export type AgentProtocolCreatePromptArgs = OpenAPIChainOptions &
  ZeroShotCreatePromptArgs & {
    openAPISpecUrl?: string;
  };
/**
 * Extends the `OpenApiToolkit` class and adds functionality for
 * interacting with agent-protocol-compliant agents.
 */
export class AgentProtocolToolkit extends OpenApiToolkit {
  constructor(
    jsonSpec: JsonSpec,
    llm: BaseLanguageModel,
    args: AgentProtocolCreatePromptArgs,
  ) {
    super(jsonSpec, llm, args.headers);
    // Add any additional tools or functionality needed for agent-protocol-compliant agents here.
  }
}

/**
 * Creates an agent that can interact with agent-protocol-compliant agents.
 * @param llm The language model to use.
 * @param agentProtocolToolkit The AgentProtocolToolkit to use.
 * @param args Optional arguments for creating the prompt.
 * @returns An AgentExecutor for executing the agent with the tools.
 */
export function createAgentProtocolAgent(
  llm: BaseLanguageModel,
  agentProtocolToolkit: AgentProtocolToolkit,
  args?: ZeroShotCreatePromptArgs,
) {
  // Use the existing createOpenApiAgent function, but pass in the AgentProtocolToolkit instead.
  return createOpenApiAgent(llm, agentProtocolToolkit, args);
}
