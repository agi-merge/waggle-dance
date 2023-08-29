import { PromptTemplate } from "langchain/prompts";

const schema = (format: string) =>
  `Array of
type: "enhancement" | "error" | "warning" | "pass";
message: string;
refinedPrompt: string;
THE ONLY THING YOU MUST OUTPUT IS valid ${format} that represents the array of feedbacks. The array shall be at the root level.
`.trim();
export function createRefinePrompt(params: {
  goal: string;
  tools: string;
  returnType: "JSON" | "YAML";
}): PromptTemplate {
  const { goal, tools, returnType } = params;

  const template = `
  You are a refining AI agent that is helping to verify the tenacity of the User's GOAL.
  User's GOAL: ${goal}
  Server TIME: ${new Date().toString()}
  TOOLS: ${tools}
  SCHEMA: ${schema(returnType)}
  RETURN: ONLY a single ChainPacket with the result of as described in SCHEMA${
    returnType === "JSON" ? ":" : ". Do NOT return JSON:"
  }
  `.trim();

  return PromptTemplate.fromTemplate(template);
}
