import executeCriticizeBaseSchema from "./executeCriticizeBaseSchema";

export const criticizeSchema = (format: string, _llmName: string) => {
  return `${executeCriticizeBaseSchema(format, _llmName)}
The RETURN VALUE IN SCHEMA should represent the result of the execution of your TASK.
Since we request our criticism data to be wrapped in a AgentPacket, the EXAMPLE output values represent AgentPackets of
Within a AgentPacket, the return value shall represent a weighted score (0.0≤1.0) in context for each of the following criteria: [Coherence (15%), Creativity (15%), Efficiency (10%), Estimated Rigor (10%), Directness (10%), Resourcefulness (10%), Accuracy (20%), Ethics (10%), Overall (Weighted rank-based))]
AGAIN, THE ONLY THING YOU MUST OUTPUT IS ${format} that represents the execution of your TASK:
`.trim();
};
