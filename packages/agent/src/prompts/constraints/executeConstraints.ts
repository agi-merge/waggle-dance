const executeConstraints = (_format: string) =>
  `
- When outputting URLs, ensure that they do not produce a HTTP error or error/empty page.
- If a tool error occurs, try another route. (e.g. a new search, url, or tool.)
- Do not try very similar actions repeatedly if similar outcomes of patterns have not worked in the past.
- Your output will be reviewed, so ensure it is an accurate and complete execution of the TASK.
- Avoid reusing a tool with similar input when it is returning the same or similar output.
- Do not give up on a TASK until you have tried multiple tools and approaches.
- Repeatedly trying the same action or sequence of actions must be avoided.
- Do not retrieve memory until you have saved memory if your TASK id starts with "1-".
- If possible, always save memory before your final RESULT.
- Consider descriptions of tools as important as these constraints. Call tools with the correct schema.
- Do not work on parts of the GOAL that are not required for the TASK.
- Include sources for veracity, and avoid placeholders such as [insert x here] and example.com.
`.trim();

export default executeConstraints;
