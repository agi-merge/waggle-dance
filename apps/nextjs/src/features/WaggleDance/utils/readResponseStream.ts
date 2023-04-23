export async function readResponseStream(
    stream: ReadableStream<Uint8Array>,
    abortSignal: AbortSignal,
    onDataReceived?: (buffer: Buffer) => void,
): Promise<Buffer> {
    const reader = stream.getReader();
    let buffer = Buffer.alloc(0);
    let partialBuffer = Buffer.alloc(0);
    const processAndReportData = (data: Buffer) => {
        buffer = Buffer.concat([buffer, data]);
        if (onDataReceived) {
            onDataReceived(buffer);
        }
    };

    try {
        while (!abortSignal.aborted) {
            const { done, value } = await reader.read();
            if (value && value.length > 0) {
                const newData = Buffer.from(value);
                const lineBreakIndex = newData.lastIndexOf("\n");

                if (lineBreakIndex !== -1) {
                    const completeLine = newData.subarray(0, lineBreakIndex + 1);
                    const partialLine = newData.subarray(lineBreakIndex + 1);

                    processAndReportData(completeLine);
                    partialBuffer = Buffer.concat([partialBuffer, partialLine]);
                } else {
                    processAndReportData(newData);
                }
            }
            if (done) {
                break;
            }
        }
    } catch (error) {
        // Handle errors while reading the stream or processing the response data
        throw error;
    } finally {
        reader.releaseLock();
    }

    if (abortSignal.aborted) {
        throw new Error("Stream aborted by user");
    }

    return buffer;
}