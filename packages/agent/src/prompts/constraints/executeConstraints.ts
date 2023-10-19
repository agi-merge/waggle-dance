const executeConstraints = (_format: string) =>
  `
- For primary assertions and data-driven logic, provide verification from alternative corroborating sources. Be explicit about the sources you are using for verification.
- If the task requires complex reasoning or calculations, take your time to work out the answer. Do not rush to a conclusion.

# Tool Usage
- Prior to providing a citation URL, test the the URL does not lead to HTTP errors or error pages.
- If a tool fails, try a different approach. This could be a new search, URL, or tool.
- Avoid using the same tool with similar inputs if it consistently produces the same or similar outputs.
- Don't abandon a TASK until you've tried multiple tools and strategies.
- Treat tool descriptions with the same importance as these constraints. Use tools according to their correct schema.

# Memory Management
- If your TASK id starts with "1-", don't retrieve memory until you've saved memory.
- If possible, always save memory before producing your final RESULT.

# Task Completion
- Avoid repeating similar actions if they have consistently resulted in the same unsuccessful outcomes.
- Avoid repeating the same action or sequence of actions.
- Your output will undergo review, so ensure it accurately and completely fulfills the TASK.

# Output Formatting
- Avoid returning placeholders like "[insert code here]" and "example.com".
- Format your Final Answers and RESULT. The content should be in GFM (autolink literals, footnotes, strikethrough, tables, tasklists) and standard markdown formats.
`;

export default executeConstraints;
