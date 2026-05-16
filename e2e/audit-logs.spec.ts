import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/audit-logs')
})

test('audit logs page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible()
})

test('shows actor + severity filters', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Actor', { exact: true })).toBeVisible()
  await expect(page.getByText('Severity', { exact: true })).toBeVisible()
})

test('shows events list or empty state', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const hasEmpty = await page.getByText(/no events in this window/i).isVisible()
  const hasRows = (await page.getByRole('button', { name: /view event details/i }).count()) > 0
  expect(hasEmpty || hasRows).toBeTruthy()
})
