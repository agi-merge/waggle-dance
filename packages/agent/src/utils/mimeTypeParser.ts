import { stringify as jsonStringify } from "superjson";
import { stringify as yamlStringify } from "yaml";

export type Data = {
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
};
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
