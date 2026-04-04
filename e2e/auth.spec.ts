import { test, expect } from '@playwright/test'

// These run without auth state (login page tests)
test.use({ storageState: { cookies: [], origins: [] } })

const EMAIL = process.env.ADMIN_EMAIL || 'superadmin@example.com'
const PASSWORD = process.env.ADMIN_PASSWORD || 'password123'

test('login page loads correctly', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Welcome back')).toBeVisible()
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  await expect(page.getByPlaceholder('••••••••')).toBeVisible()
})

test('shows error for invalid credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('wrong@example.com')
  await page.getByPlaceholder('••••••••').fill('wrongpassword')
  await page.getByRole('button', { name: 'Sign in' }).click()
  // Toast or inline error should appear
  await expect(page.getByText(/invalid|incorrect|credentials/i)).toBeVisible({ timeout: 8_000 })
})

test('shows validation error for empty fields', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText(/required/i)).toBeVisible()
})

test('login with valid credentials redirects to dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByPlaceholder('••••••••').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 })
})

test('unauthenticated access to dashboard redirects to login', async ({ page }) => {
  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/login/, { timeout: 8_000 })
})
