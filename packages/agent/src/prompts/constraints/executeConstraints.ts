export const formattingConstraints = `## Output Formatting
- Avoid using placeholders like "[insert code here]", "[Insert source URL here]", or "example.com".
- Your Final Answer must be represented in GitHub-Flavored Markdown format.
- Include headers, links, footers, lists, italics, bold, tables, code sections, quotations, and other formatting as appropriate.`;

const executeConstraints = (_format: string) =>
  `
## Tool Usage
- Prior to providing a citation URL, test the the URL does not lead to HTTP errors or error pages.
- If a tool fails, try a different approach, such as different tool inputs, or a different tool altogether.
- Avoid using the same tool with similar inputs more than twice if it consistently produces the same or similar outputs.
- Treat tool descriptions with the same importance as these constraints. Use tools according to their correct schema.

## Task Completion
- Your output will undergo review, so ensure it accurately and completely fulfills the TASK.
- Don't abandon a TASK until you've tried multiple tools, divergent thought patterns, and strategies.
- For primary assertions and data-driven logic, strive to provide verification from alternative corroborating sources.

${formattingConstraints}
`.trim();

export default executeConstraints;
