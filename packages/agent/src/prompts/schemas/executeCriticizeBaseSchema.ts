export const executeCriticizeBaseSchema = (_format: string, _llmName: string) =>
  `
AgentPacket
| type: "done"; value: string // result of TASK
| type: "error"; severity: "warn" | "fatal", message: string // only if the task is not completable/completed.
`.trim();

export default executeCriticizeBaseSchema;
