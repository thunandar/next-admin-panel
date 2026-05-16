import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/settings')
})

test('settings page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
})

test('tabs are clickable and reveal corresponding panels', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // Storefront tab is default
  await expect(page.getByText(/promo banner/i).first()).toBeVisible()

  await page.getByRole('tab', { name: 'Hero' }).click()
  await expect(page.getByText(/headline · lead/i)).toBeVisible({ timeout: 5_000 })

  await page.getByRole('tab', { name: 'Brand' }).click()
  await expect(page.getByText('Name')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('Tagline')).toBeVisible()

  await page.getByRole('tab', { name: 'Trust' }).click()
  await expect(page.getByText(/trust strip/i)).toBeVisible({ timeout: 5_000 })
})

test('save changes button is visible on each tab', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  for (const tabName of ['Hero', 'Brand', 'Trust', 'Storefront']) {
    await page.getByRole('tab', { name: tabName }).click()
    await expect(page.getByRole('button', { name: /save changes/i }).first()).toBeVisible({ timeout: 5_000 })
  }
})
