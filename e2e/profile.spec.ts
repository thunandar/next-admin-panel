import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/profile')
})

test('profile page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
})

test('profile fields are pre-filled', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const nameInput = page.locator('input').first()
  const email = page.locator('input[type="email"]')
  await expect(nameInput).not.toHaveValue('')
  await expect(email).not.toHaveValue('')
})

test('security section is visible', async ({ page }) => {
  await expect(page.getByText('Security')).toBeVisible()
  await expect(page.getByText('Password')).toBeVisible()
  await expect(page.getByText('Two-factor authentication')).toBeVisible()
})

test('change password form expands and collapses', async ({ page }) => {
  await page.getByRole('button', { name: 'Change' }).click()
  await expect(page.getByText('Current password')).toBeVisible()
  await expect(page.getByText('New password')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('Current password')).toBeHidden()
})

test('notifications section is visible', async ({ page }) => {
  await expect(page.getByText('Notifications')).toBeVisible()
  await expect(page.getByText('New orders')).toBeVisible()
  await expect(page.getByText(/low stock alerts/i)).toBeVisible()
})
