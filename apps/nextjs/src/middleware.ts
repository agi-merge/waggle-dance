
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 } from 'uuid';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    if (url.pathname === '/') {
        const id = `tempgoal-${v4()}`
        url.pathname = `/goal/${`${id}`}}`
        return NextResponse.redirect(url)
    }
}