export default async function readJSONL<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response || !response.ok || !response.body) {
    throw new Error(`Fetch error: ${response.statusText}`);
  }
  const reader = response.body.getReader();
  const textDecoder = new TextDecoder("utf-8");

  let lineBuffer = "";
  const result: T[] = [];

  while (true) {
    const { done, value } = await reader.read();
    const decodedValue = textDecoder.decode(value || new Uint8Array(), {
      stream: !done,
    });

    let startIndex = 0;
    for (let i = 0; i < decodedValue.length; i++) {
      if (decodedValue[i] === "\n") {
        lineBuffer += decodedValue.slice(startIndex, i);
        startIndex = i + 1;
        const parsedObject = JSON.parse(lineBuffer) as T;
        result.push(parsedObject);
        lineBuffer = "";
      }
    }

    lineBuffer += decodedValue.slice(startIndex);

    if (done) {
      if (lineBuffer.length > 0) {
        const parsedObject = JSON.parse(lineBuffer) as T;
        result.push(parsedObject);
      }
      break;
    }
  }
  return result;
}
