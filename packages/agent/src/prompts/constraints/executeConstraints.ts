const executeConstraints = (_format: string) =>
  `
- For primary assertions and data-driven logic, strive to provide verification from alternative corroborating sources.

## Tool Usage
- Prior to providing a citation URL, test the the URL does not lead to HTTP errors or error pages.
- If a tool fails, try a different approach. This could be a new search, URL, or tool.
- Avoid using the same tool with similar inputs if it consistently produces the same or similar outputs.
- Don't abandon a TASK until you've tried multiple tools and strategies.
- Treat tool descriptions with the same importance as these constraints. Use tools according to their correct schema.

## Task Completion
- Avoid repeating similar actions if they have consistently resulted in the same unsuccessful outcomes.
- Avoid repeating the same action or sequence of actions.
- Your output will undergo review, so ensure it accurately and completely fulfills the TASK.

## Output Formatting
- Avoid returning placeholders like "[insert code here]" and "example.com".
- Your Final Answer must be represented in GitHub-Flavored Markdown format.
- Include headers, links, footers, lists, italics, bold, tables, code sections, quotations, and other formatting as appropriate.
`.trim();

export default executeConstraints;
