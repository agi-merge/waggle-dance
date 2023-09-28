import { createClient } from "@vercel/kv";

type LockFunction<T> = () => Promise<T>;

async function withLock<T>(key: string, fn: LockFunction<T>): Promise<T> {
  if (!process.env.KV_REST_API_URL) {
    throw new Error("Missing KV_REST_API_URL");
  }
  if (!process.env.KV_REST_API_TOKEN) {
    throw new Error("Missing KV_REST_API_TOKEN");
  }

  const kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  // Try to acquire the lock
  const lockAcquired = await kv.set(`${key}-lock`, "locked", {
    nx: true,
    ex: 10,
  });

  if (!lockAcquired) {
    throw new Error("Could not acquire lock");
  }

  try {
    // Execute the function
    return await fn();
  } finally {
    // Release the lock
    await kv.del(`${key}-lock`);
  }
}

export default withLock;
