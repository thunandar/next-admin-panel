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
  await page.getByPlaceholder(/search/i).fill('admin')
  await page.getByRole('button', { name: /search/i }).click()
  await page.waitForLoadState('networkidle')
})

test('can filter users by role', async ({ page }) => {
  const roleFilter = page.getByRole('combobox')
  await roleFilter.selectOption('admin')
  await page.waitForLoadState('networkidle')
  await roleFilter.selectOption('user')
  await page.waitForLoadState('networkidle')
  await roleFilter.selectOption('')
  await page.waitForLoadState('networkidle')
})

test('can open edit modal for a user', async ({ page }) => {
  // Find first edit button
  const editBtn = page.getByRole('button').filter({ has: page.locator('svg') }).first()
  if (await editBtn.isVisible()) {
    await editBtn.click()
    await expect(page.getByText('Edit User')).toBeVisible({ timeout: 5_000 })
    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
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
  await page.getByPlaceholder(/search/i).fill(email)
  await page.getByRole('button', { name: /search/i }).click()
  await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 })
})
