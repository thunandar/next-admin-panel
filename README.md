# Nexus Commerce — Admin Panel

Admin dashboard for **Nexus Commerce**, a showcase e-commerce platform. Built with Next.js 16 (App Router), TypeScript, and Tailwind v4.

Pairs with:
- API: [express-postgres-project](https://github.com/thunandar/express-postgres-project)
- Storefront: [next-user-site](https://github.com/thunandar/next-user-site)

> Showcase / learning project — not production.

## Features

- JWT-based auth with silent token refresh (HttpOnly refresh cookie)
- Role-gated access — only `admin` / `super_admin` may enter
- Product management (variants, images, categories, vendors)
- Order management with status updates and refund flow
- Reviews moderation, abandoned-cart insights, coupons
- Journal (blog) editor, site settings, audit logs
- User management (super_admin only)
- Analytics dashboard with charts
- Dark mode

## Tech stack

- **Framework**: Next.js 16.1, React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4, Instrument Serif (Nexus Commerce design system)
- **Forms**: react-hook-form + Zod
- **HTTP**: axios with silent-refresh interceptor
- **Charts**: Recharts
- **Auth verify** (middleware): `jose`
- **E2E**: Playwright

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in API_URL, NEXT_PUBLIC_API_URL, JWT_SECRET
npm run dev
```

Opens on **http://localhost:3002**.

The backend must be running too — see `../express-postgres-project`. Locally the API listens on `:3000`, so point this app at `http://localhost:3000` via the env vars.

## Environment variables

| Variable | Description |
|---|---|
| `API_URL` | Backend URL used by Next.js server-side routes / middleware. Not exposed to the browser. |
| `NEXT_PUBLIC_API_URL` | Backend URL used by the browser (image URLs, client-side calls). |
| `JWT_SECRET` | **Must match** the backend's `JWT_SECRET` — the middleware verifies admin tokens with `jose.jwtVerify`. Generate with `openssl rand -base64 64`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional — for web push notifications. |

## Auth flow

1. Login → `app/api/auth/login` → backend. Refresh token saved as HttpOnly cookie; access token returned to the client.
2. Access token is kept in memory; a copy in a `SameSite=Strict` cookie (`admin_access_token`) lets `proxy.ts` (Next middleware) check it server-side.
3. `proxy.ts` verifies the cookie's signature with `jose.jwtVerify` and enforces `role === 'admin' | 'super_admin'`. Expired-but-valid tokens pass through (refreshed by the axios interceptor).
4. On 401, the axios interceptor silently refreshes once and retries the failed request.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on `:3002` |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright suite (needs `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |

## Running E2E tests

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret npx playwright test
```

No hardcoded credentials — the env vars are required.

## Deployment

Deployed on **Vercel** — auto-deploys on push to `main`. Both `API_URL` / `NEXT_PUBLIC_API_URL` point to the Render-hosted backend, and `JWT_SECRET` must mirror the backend's.

See `../deployment.md` and `../vercel-env.md` for the full setup.

## License

[MIT](./LICENSE) © 2026 Thu Nandar Aye Min
