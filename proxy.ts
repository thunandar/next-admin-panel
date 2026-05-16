import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, decodeJwt } from 'jose'
import { ACCESS_TOKEN_COOKIE, ROUTES, isAdminRole } from './lib/constants'

const PUBLIC_PATHS: string[] = [ROUTES.login]

async function getRoleFromToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return (payload.role as string) ?? null
  } catch (err) {
    // Expired-but-valid-signature tokens are let through; the axios interceptor
    // will silently refresh before retrying the API call.
    if (err instanceof Error && err.name === 'JWTExpired') {
      try {
        const payload = decodeJwt(token)
        return (payload.role as string) ?? null
      } catch {
        return null
      }
    }
    return null
  }
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.includes(pathname)

  if (!token) {
    if (isPublic) return NextResponse.next()
    return NextResponse.redirect(new URL(ROUTES.login, request.url))
  }

  const role = await getRoleFromToken(token)
  const isPrivileged = isAdminRole(role)

  if (isPublic) {
    if (isPrivileged) return NextResponse.redirect(new URL(ROUTES.dashboard, request.url))
    return NextResponse.next()
  }

  if (!isPrivileged) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
