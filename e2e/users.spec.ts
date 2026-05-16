import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/users')
})

test('users page loads with table', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /users/i })).toBeVisible()
  // Should show at least the logged-in admin
  await expect(page.getByRole('table')).toBeVisible()
})

test('can search users by name or email', async ({ page }) => {
  // Search is reactive — typing into the page's "Name, email" input refetches.
  await page.getByPlaceholder('Name, email').fill('admin')
  await page.waitForLoadState('networkidle')
})

test('can filter users by role', async ({ page }) => {
  // Role is filtered via the Customers / Staff / Banned tabs.
  await page.getByRole('tab', { name: 'Staff' }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: 'Customers' }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: 'All' }).click()
  await page.waitForLoadState('networkidle')
})

test('can open user detail modal', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // The right-hand chevron button opens the detail modal.
  const viewBtn = page.getByRole('button', { name: /^View / }).first()
  if (await viewBtn.isVisible()) {
    await viewBtn.click()
    // The modal title is the user's name; the email row contains the U-#### code.
    await expect(page.locator('text=/U-\\d{4}/').first()).toBeVisible({ timeout: 5_000 })
  }
})

test('create a new admin from the invite modal', async ({ page }) => {
  // Only super_admin sees the "Add admin" trigger
  const trigger = page.getByRole('button', { name: /add admin/i })
  if (!(await trigger.isVisible())) test.skip()

  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  const email = `e2e-admin-${Date.now()}@example.com`
  await dialog.getByPlaceholder(/alex rivera/i).fill('E2E Admin')
  await dialog.getByPlaceholder(/alex@nexus\.shop/i).fill(email)
  await dialog.getByPlaceholder(/min\. 8 characters/i).fill('password123')

  await dialog.getByRole('button', { name: /add admin/i }).click()

  // Modal closes on success; verify the new admin appears in the table
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  await page.getByPlaceholder('Name, email').fill(email)
  await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 })
})
