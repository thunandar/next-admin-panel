import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/profile')
})

test('profile page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
})

test('profile fields are pre-filled', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const email = page.locator('input[type="email"]')
  await expect(email).not.toHaveValue('')
  // The name input has no explicit `type` (defaults to text). The hidden file
  // input and the email input also live in <main>, so exclude both.
  const name = page.locator('main input:not([type])').first()
  await expect(name).not.toHaveValue('')
})

test('security section is visible', async ({ page }) => {
  await expect(page.getByText('Security')).toBeVisible()
  await expect(page.getByText('Password')).toBeVisible()
  await expect(page.getByText('Two-factor authentication')).toBeVisible()
})

test('change password form expands and collapses', async ({ page }) => {
  await page.getByRole('button', { name: 'Change', exact: true }).click()
  await expect(page.getByText('Current password')).toBeVisible()
  await expect(page.getByText('New password', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Current password')).toBeHidden()
})

test('notifications section is visible', async ({ page }) => {
  await expect(page.getByText('Notifications', { exact: true })).toBeVisible()
  await expect(page.getByText('New orders')).toBeVisible()
  await expect(page.getByText(/low stock alerts/i)).toBeVisible()
})
