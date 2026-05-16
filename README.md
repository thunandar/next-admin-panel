# Next.js Admin Panel

A full-featured admin dashboard for managing products, orders, users, and analytics. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Features

- JWT-based authentication with silent token refresh
- Role-based access control (`admin`, `super_admin`)
- Product management with image uploads
- Order management with status updates
- User management (super_admin only)
- Audit logs
- Analytics dashboard with charts
- Dark mode support

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `API_URL` | Backend URL used by Next.js server-side API routes (never exposed to the browser) |
| `NEXT_PUBLIC_API_URL` | Backend URL used in the browser for image URLs and client-side calls |
| `JWT_SECRET` | Must match the secret used by the backend to sign JWT tokens. Generate with `openssl rand -base64 64` |

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth flow

1. Login → Next.js `/api/auth/login` → backend. Refresh token stored in an HttpOnly cookie; access token returned to client.
2. Access token lives in memory only (not localStorage). A copy in a `SameSite=Strict` cookie lets the middleware check it server-side.
3. On every page load, a silent `/api/auth/refresh` call re-hydrates the access token using the HttpOnly refresh cookie.
4. On 401, the axios interceptor automatically refreshes and retries the failed request once.

## Running E2E tests

Set credentials before running (no hardcoded fallbacks):

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret npx playwright test
```

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Axios](https://axios-http.com/)
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- [Recharts](https://recharts.org/)
- [Playwright](https://playwright.dev/) (E2E tests)
