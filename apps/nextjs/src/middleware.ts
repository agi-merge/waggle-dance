
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 } from 'uuid'

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone()
    if (url.pathname === '/' || url.pathname === '') {
        url.pathname = `/goal/tempgoal-${v4()}`
        return NextResponse.redirect(url)
    }
}