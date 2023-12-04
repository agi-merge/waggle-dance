import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";
import type { z } from "zod";

export interface Data {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | Data
    | Data[]
    | string[]
    | number[]
    | boolean[]
    | object
    | object[]
    | null[];
}
export type ParseableMimeTypes = "application/json" | "application/yaml";
export type DisplayMimeTypes = "JSON" | "YAML";

// takes a mime type and returns a displayable version
export const mimeTypeToPromptDisplayable = (
  mimeType: ParseableMimeTypes,
): DisplayMimeTypes => {
  // split by /, take the last element, then capitalize the entire thing
  // return mimeType.split("/").pop()!.toUpperCase(); // JSON |
  switch (mimeType) {
    case "application/json":
      return "JSON";
    case "application/yaml":
      return "YAML";
  }
};

export function stringifyByMime(
  returnType: ParseableMimeTypes | DisplayMimeTypes,
  data: unknown,
): string {
  switch (returnType) {
    case "application/json":
    case "JSON":
      return jsonStringify(data);
    case "application/yaml":
    case "YAML":
      return yamlStringify(data);
  }
}

export function parseByMime(
  returnType: ParseableMimeTypes | DisplayMimeTypes,
  data: string,
): unknown {
  switch (returnType) {
    case "application/json":
    case "JSON":
      return jsonParse(data);
    case "application/yaml":
    case "YAML":
      return yamlParse(data);
  }
}

export function parseAnyFormat<T>(
  data: string,
  schema: z.ZodType<T>,
): T | null | undefined {
  try {
    const json = jsonParse(data);
    schema.parse(json);
    return json as T | null | undefined;
  } catch (err) {
    try {
      const yaml: unknown = yamlParse(data);
      schema.parse(yaml);
      return yaml as T | null | undefined;
    } catch (err) {
      return null;
    }
  }
}
