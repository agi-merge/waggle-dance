import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "./env.mjs";

// type PostParameters = {
//   "cf-turnstile-response": string;
// };
// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret || request.method !== "POST") {
    return NextResponse.next();
  }
  const body = await request.formData();
  // Turnstile injects a token in "cf-turnstile-response".
  const token = body.get("cf-turnstile-response");
  const ip = request.headers.get("CF-Connecting-IP");

  if (!token || !ip) {
    return NextResponse.error();
  }
  // Validate the token by calling the
  // "/siteverify" API endpoint.
  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token?.toString() || "");
  formData.append("remoteip", ip || "");

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const outcome = await result.json();
  if (outcome.success) {
    return NextResponse.next();
  } else {
    return NextResponse.error();
  }
}

// See "Matching Paths" below to learn more
export const config = {
  runtime: "experimental-edge",
  matcher: "/api/:path*",
};
