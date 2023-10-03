import { type CallbackManagerForToolRun } from "langchain/callbacks";
import {
  DynamicStructuredTool,
  DynamicTool,
  type StructuredTool,
} from "langchain/tools";
import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";
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

  toTool(
    agentType: AgentPromptingMethod,
    _returnType: "YAML" | "JSON",
  ): StructuredTool {
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
      return new DynamicStructuredTool(options);
    } else {
      // const schemaString =
      //   returnType === "JSON"
      //     ? jsonStringify(options.schema.shape)
      //     : yamlStringify(
      //         options.schema.shape,
      //         Object.getOwnPropertyNames(options.schema),
      //       );
      const schemaString = yamlStringify(
        jsonParse(jsonStringify(options.schema.shape)),
      );
      options.description = `${options.description}. Your input must follow this schema: ${schemaString}`;
      return new DynamicTool(options);
    }
  }
}

export default AbstractedSkill;
