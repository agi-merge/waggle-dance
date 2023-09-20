import { stringify } from "yaml";

export const stringifyMax = (value: unknown, max: number) => {
  if (value === undefined || value === null) {
    return "…";
  }
  const json = stringify(value);
  return json && json.length < max ? json : `${json.slice(0, max)}…`;
};
