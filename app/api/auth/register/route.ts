import { NextRequest, NextResponse } from 'next/server'

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function POST(req: NextRequest) {
  const body = await req.json()

  const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  const { accessToken, refreshToken, user } = data.data

  const response = NextResponse.json({
    success: true,
    message: data.message,
    data: { user, accessToken },
  })

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}
