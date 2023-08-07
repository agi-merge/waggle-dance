// middleware.ts

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { newDraftGoalRoute } from "./stores/goalStore";
import routes from "./utils/routes";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  if (
    url.pathname === routes.home ||
    url.pathname === "" ||
    url.pathname === "/goal"
  ) {
    url.pathname = newDraftGoalRoute();
    return NextResponse.rewrite(url);
  }
}
