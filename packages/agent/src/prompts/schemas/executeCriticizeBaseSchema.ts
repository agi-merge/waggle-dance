export const executeCriticizeBaseSchema = (_format: string, _llmName: string) =>
  `
AgentPacket
| type: "done"; value: string // result of TASK
| type: "error"; severity: "warn" | "human" | "fatal", message: string
| type: "requestHumanInput"; reason: string
`.trim();

export default executeCriticizeBaseSchema;
