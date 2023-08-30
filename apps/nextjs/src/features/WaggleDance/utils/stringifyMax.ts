import { stringify } from "superjson";

export const stringifyMax = (value: unknown, max: number) => {
  const json = stringify(value);
  return json && json.length < max ? json : `${json.slice(0, max)}…`;
};
