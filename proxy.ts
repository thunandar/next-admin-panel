import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role ?? null
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.includes(pathname)

  // Not logged in
  if (!token) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = getRoleFromToken(token)

  // On login/register: only skip if confirmed admin, otherwise show login page
  // (non-admins or undecodable tokens should be able to log in with admin credentials)
  if (isPublic) {
    if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    return NextResponse.next()
  }

  // Non-admin (or undecodable token) trying to access this panel → login
  if (role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
