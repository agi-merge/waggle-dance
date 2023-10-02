import { type CallbackManagerForToolRun } from "langchain/callbacks";
import {
  DynamicStructuredTool,
  DynamicTool,
  type StructuredTool,
} from "langchain/tools";
import { type z } from "zod";

import { AgentPromptingMethod } from "../utils/llms";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SkillFunction<T extends z.ZodObject<any, any, any, any>> = (
  input: z.infer<T>,
  runManager?: CallbackManagerForToolRun,
) => Promise<string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SkillOptions<T extends z.ZodObject<any, any, any, any>> {
  name: string;
  description: string;
  func: SkillFunction<T>;
  schema: T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class AbstractedSkill<T extends z.ZodObject<any, any, any, any>> {
  private skill: SkillOptions<T>;

  constructor(options: SkillOptions<T>) {
    this.skill = options;
  }

  toTool(agentType: AgentPromptingMethod): StructuredTool {
    const options = {
      name: this.skill.name,
      description: this.skill.description,
      func: this.skill.func,
      schema: this.skill.schema,
    };

    if (
      agentType === AgentPromptingMethod.OpenAIFunctions ||
      agentType === AgentPromptingMethod.OpenAIStructuredChat
    ) {
      if (!this.skill.schema) {
        throw new Error("Schema is required for DynamicStructuredTool");
      }
      return new DynamicStructuredTool(options);
    } else {
      options.description = `${
        options.description
      } You must use the following schema as input: ${JSON.stringify(
        options.schema.shape,
        null,
        2,
      ).replaceAll(/[{}]/g, "")}`;
      // Add more else if blocks here for other agentTypes, returning the appropriate Tool instance for each one.
      // If none of the conditions match, return a default Tool instance or throw an error.
      return new DynamicTool(options);
    }
  }
}

export default AbstractedSkill;
