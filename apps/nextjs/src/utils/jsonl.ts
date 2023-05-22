export default function readJSONL<T>(lineBuffer: string): T[] {

  const result: T[] = [];

  if (lineBuffer.length > 0) {
    const parsedObject = JSON.parse(lineBuffer) as T;
    result.push(parsedObject);
  }
  return result;
}
