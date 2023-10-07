import { NextResponse, type NextRequest } from "next/server";

// run only on homepage
export const config = {
  matcher: "/api/agent/:path*",
};

export function middleware(req: NextRequest) {
  return NextResponse.next(req);
}
