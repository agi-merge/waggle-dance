// utils/streamHandler.ts

export async function readResponseStream(stream: ReadableStream<Uint8Array>, abortSignal: AbortSignal): Promise<Buffer | undefined> {
    const reader = stream.getReader();
    let buffer = Buffer.alloc(0);

    try {
        while (!abortSignal.aborted) {
            const { done, value } = await reader.read();
            if (value && value.length > 0) {
                buffer = Buffer.concat([buffer, Buffer.from(value)]);
            }
            if (done) {
                return buffer;
            }
        }
    } catch (error) {
        // Handle errors while reading the stream or processing the response data
        throw error;
    } finally {
        reader.releaseLock();
    }

    return undefined;
}