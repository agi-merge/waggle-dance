const executeConstraints = (_format: string) =>
  `
- When outputting URLs, ensure that they do not produce a HTTP error or error/empty page.
- If a tool error occurs, try another route. (e.g. a new search, url, or tool.)
- Do not try very similar actions repeatedly if similar outcomes of patterns have not worked in the past.
- Your output will be reviewed, so ensure it is an accurate and complete execution of the TASK.
- Avoid reusing a tool with similar input when it is returning similar results too often.
- Do not give up on a TASK until you have tried multiple tools and approaches.
- Consider descriptions of tools as important as these constraints.
`.trim();

export default executeConstraints;
