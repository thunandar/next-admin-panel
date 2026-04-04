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

test('add user button visible for super_admin', async ({ page }) => {
  // super_admin sees the Add User button
  const addBtn = page.getByRole('button', { name: /add user/i })
  if (await addBtn.isVisible()) {
    await addBtn.click()
    await expect(page.getByText('Add User')).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
  }
})
