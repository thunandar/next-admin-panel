import { NextRequest, NextResponse } from 'next/server'

const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ success: false, message: 'No refresh token' }, { status: 401 })
  }

  const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    const response = NextResponse.json(data, { status: backendRes.status })
    response.cookies.delete('refresh_token')
    return response
  }

  const { accessToken, refreshToken: newRefreshToken } = data.data

  const response = NextResponse.json({ success: true, data: { accessToken } })

  // Rotate: set the new refresh token, old one is now invalid in the DB
  response.cookies.set('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}
