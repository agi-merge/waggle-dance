const executeConstraints = (_format: string) =>
  `
- When outputting URLs, ensure that they do not produce a HTTP error or error/empty page.
- If a tool error occurs, try another route. (e.g. a new search, url, or tool.)
- If the TASK is not sufficiently complete, RETURN an AgentPacket of type "error" or "requestHumanInput".
- Do not try very similar actions repeatedly if similar outcomes of patterns have not worked in the past.
- Your output will be reviewed, so ensure it is an accurate and complete execution of the TASK.
`.trim();

export default executeConstraints;
