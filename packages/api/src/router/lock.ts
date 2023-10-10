import { createClient } from "@vercel/kv";

import { sleep } from "../sleep";

type LockFunction<T> = () => Promise<T>;

async function withLock<T>(
  key: string,
  fn: LockFunction<T>,
  retries: number = 5,
  delay: number = 500,
): Promise<T> {
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

  let attempt = 0;
  while (attempt < retries) {
    // Try to acquire the lock
    const lockAcquired = await kv.set(`${key}-lock`, "locked", {
      nx: true,
      ex: 10,
    });

    if (lockAcquired) {
      try {
        // Execute the function
        return await fn();
      } finally {
        // Release the lock
        await kv.del(`${key}-lock`);
      }
    }

    // If lock not acquired, wait for a bit before retrying
    await sleep(delay * Math.pow(2, attempt));
    attempt++;
  }

  throw new Error("Could not acquire lock after multiple attempts");
}

export default withLock;
