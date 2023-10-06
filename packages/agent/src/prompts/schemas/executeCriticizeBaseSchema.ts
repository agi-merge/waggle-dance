export const executeCriticizeBaseSchema = (_format: string, _llmName: string) =>
  `
AgentPacket
| type: "done"; value: string // result of TASK
| type: "error"; severity: "warn" | "fatal", message: string // only if you failed to sufficiently complete the task
`.trim();

export default executeCriticizeBaseSchema;
