type Constructor<T> = new (...args: unknown[]) => T;

/* Check whether array is of the specified type */
export const isArrayOfType = <T>(
  arr: unknown[],
  type: Constructor<T> | string,
): arr is T[] => {
  return (
    Array.isArray(arr) &&
    arr.every((item): item is T => {
      if (typeof type === "string") {
        return typeof item === type;
      } else {
        return item instanceof type;
      }
    })
  );
};

export const extractTasks = (
  text: string,
  completedTasks: string[],
): string[] => {
  return extractArray(text)
    .filter(realTasksFilter)
    .filter((task) => !(completedTasks || []).includes(task));
};

// TODO: make this much more robust response fixing, see Auto-GPT
export const extractArray = (inputStr: string): string[] => {
  try {
    // Check if the parsed JSON is an array
    if (Array.isArray(JSON.parse(inputStr))) {
      return JSON.parse(inputStr) as string[];
    } else {
      console.warn(
        "Error, extracted JSON from inputString is not an array:",
        inputStr,
      );
    }
  } catch (error) {
    console.error("Error parsing the inputString as JSON:", error);
  }

  return [];
};

// Model will return tasks such as "No tasks added". We should filter these
export const realTasksFilter = (input: string): boolean => {
  const noTaskRegex =
    /^No( (new|further|additional|extra|other))? tasks? (is )?(required|needed|added|created|inputted).*$/i;
  const taskCompleteRegex =
    /^Task (complete|completed|finished|done|over|success).*/i;
  const doNothingRegex = /^(\s*|Do nothing(\s.*)?)$/i;

  return (
    !noTaskRegex.test(input) &&
    !taskCompleteRegex.test(input) &&
    !doNothingRegex.test(input)
  );
};
