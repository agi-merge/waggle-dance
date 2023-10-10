import {
  type CallbackManagerForToolRun,
  type Callbacks,
} from "langchain/callbacks";
import { type RunnableConfig } from "langchain/schema/runnable";
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
  recoveryFunc?(input: string): SkillOptions<T>;
  schema: T;
}

// attempts to Bridge DynamicTool and DynamicStructuredTool such that a Zod schema can be used to call either.
// it chooses which tool to use based on the agentType.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class DynamicZodSkill<T extends z.ZodObject<any, any, any, any>> {
  readonly skill: SkillOptions<T>;
  private recoveryData?: unknown[];

  constructor(options: SkillOptions<T>, recoveryData?: unknown[]) {
    this.skill = options;
    this.recoveryData = recoveryData;
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
      return new DynamicZodStructuredTool(options);
    } else {
      const schemaString = `${yamlStringify(
        jsonParse(jsonStringify(options.schema.shape)),
      )}
      (convert from YAML to JSON when calling)`;
      options.description = `${options.description}. Your input must follow this schema: ${schemaString}`;
      return new DynamicZodTool(options);
    }
  }
}

export default DynamicZodSkill;
class DynamicZodTool extends DynamicTool {
  async _call(
    input: string,
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    let parsed: string;
    try {
      const parsedSchema = await this.schema.parseAsync(input);
      if (!parsedSchema) {
        parsed = jsonStringify(parsedSchema);
      } else {
        parsed = parsedSchema;
      }
    } catch (e) {
      // If parsing fails, pass the original argument
      if (typeof input === "string") {
        parsed = input;
      } else {
        // stringified, if needed
        parsed = JSON.stringify(input);
      }
    }

    console.debug(
      `_call ${this.name} tool with input:`,
      parsed,
      "and original input:",
      input,
    );
    return this.func(parsed, runManager);
  }

  call(
    arg: string | undefined | z.input<this["schema"]>,
    callbacks: Callbacks,
  ) {
    return super.call(
      typeof arg === "string" || !arg ? { input: arg } : arg,
      callbacks,
    );
  }

  // async call(arg: string | unknown, callbacks?: Callbacks): Promise<string> {
  //   // let parsed: string;
  //   // try {
  //   //   const parsedSchema = await this.schema.parseAsync(arg);
  //   //   if (!parsedSchema) {
  //   //     parsed = jsonStringify(parsedSchema);
  //   //   } else {
  //   //     parsed = parsedSchema;
  //   //   }
  //   // } catch (e) {
  //   //   // If parsing fails, pass the original argument
  //   //   if (typeof arg === "string") {
  //   //     parsed = arg;
  //   //   } else {
  //   //     // stringified, if needed
  //   //     parsed = JSON.stringify(arg);
  //   //   }
  //   // }

  //   // console.debug(`call ${this.name} tool with input:`, parsed);
  //   // return super.call(parsed, callbacks);
  //   try {
  //     const superCall = await super.call(arg, callbacks);
  //     return superCall;
  //   } catch (e) {
  //     // TODO: use recoveryFunc
  //     return e instanceof Error ? e.message : String(e);
  //   }
  // }

  async invoke(input: string, config?: RunnableConfig): Promise<string> {
    let parsed: string;
    try {
      const parsedSchema = await this.schema.parseAsync(input);
      if (!parsedSchema) {
        parsed = jsonStringify(parsedSchema);
      } else {
        parsed = parsedSchema;
      }
    } catch (e) {
      // If parsing fails, pass the original argument
      if (typeof input === "string") {
        parsed = input;
      } else {
        // stringified, if needed
        parsed = JSON.stringify(input);
      }
    }

    console.debug(`invoke ${this.name} tool with input:`, parsed);
    return super.invoke(parsed, config);
  }
}

class DynamicZodStructuredTool<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends z.ZodObject<any, any, any, any>,
> extends DynamicStructuredTool<T> {
  get lc_namespace(): string[] {
    const namespace = super.lc_namespace;
    namespace.push(this.name);
    return namespace;
  }

  get lc_id(): string[] {
    const namespace = super.lc_id;
    // move the current name to the end
    namespace.sort((a, b) => (a === this.name ? 1 : b === this.name ? -1 : 0));
    // check if the current name is at the end, if not, add it.
    if (namespace[namespace.length - 1] !== this.name) {
      namespace.push(this.name);
    }
    return namespace;
  }

  async _call(
    arg: z.output<T>,
    runManager?: CallbackManagerForToolRun,
  ): Promise<string> {
    // let parsed: string;
    // try {
    //   const parsedSchema = (await this.schema.parseAsync(arg)) as z.infer<T>;
    //   if (!parsedSchema) {
    //     parsed = jsonStringify(parsedSchema);
    //   } else {
    //     parsed = parsedSchema;
    //   }
    // } catch (e) {
    //   // If parsing fails, pass the original argument
    //   if (typeof arg === "string") {
    //     parsed = arg;
    //   } else {
    //     // stringified, if needed
    //     parsed = JSON.stringify(arg);
    //   }
    // }
    // console.debug(`_call ${this.name} structured tool with input:`, parsed);
    return this.func(arg, runManager);
  }

  async call(
    arg: z.input<T>,
    configArg?: Callbacks | RunnableConfig,
    tags?: string[],
  ): Promise<string> {
    try {
      const superCall = await super.call(arg, configArg, tags);
      return superCall;
    } catch (e) {
      // TODO: use recoveryFunc
      return e instanceof Error ? e.message : String(e);
    }
  }

  async invoke(input: z.input<T>, config?: RunnableConfig): Promise<string> {
    let parsed: string;
    try {
      const parsedSchema = (await this.schema.parseAsync(input)) as z.infer<T>;
      if (!parsedSchema) {
        parsed = jsonStringify(parsedSchema);
      } else {
        parsed = parsedSchema;
      }
    } catch (e) {
      // If parsing fails, pass the original argument
      if (typeof input === "string") {
        parsed = input;
      } else {
        // stringified, if needed
        parsed = JSON.stringify(input);
      }
    }
    console.debug(`invoke ${this.name} structured tool with input:`, parsed);
    return super.invoke(parsed, config);
  }
}
