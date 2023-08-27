import { PromptTemplate } from "langchain/prompts";

export function createRefinePrompt(params: {
  goal: string;
  tools: string;
  returnType: string;
}): PromptTemplate {
  const { goal, tools, returnType } = params;

  const template = `
  You are a refining AI agent that is helping to verify the tenacity of the User's GOAL.
  User's GOAL: ${goal}
  Server TIME: ${new Date().toString()}
  TOOLS: ${tools}
  SCHEMA: ${`TODO`}
  RETURN: ONLY a single ChainPacket with the result of as described in SCHEMA${
    returnType === "JSON" ? ":" : ". Do NOT return JSON:"
  }
  `.trim();

  return PromptTemplate.fromTemplate(template);
}
