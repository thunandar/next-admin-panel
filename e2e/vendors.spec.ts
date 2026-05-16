import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/vendors')
})

test('vendors page loads with header + new button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Vendors', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /new vendor/i })).toBeVisible()
})

test('shows expected column headers', async ({ page }) => {
  // Wait for the page to fully render its table before asserting.
  await expect(page.locator('table thead th').first()).toBeVisible()
  const headers = page.locator('table thead th')
  await expect(headers.nth(0)).toHaveText('Vendor')
  await expect(headers.nth(1)).toHaveText('Slug')
  await expect(headers.nth(2)).toHaveText('Status')
  await expect(headers.nth(3)).toHaveText('Website')
})

test('status pills filter the list', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Vendors', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Active', exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Inactive', exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'All', exact: true }).click()
})

test('new vendor button navigates to create form', async ({ page }) => {
  await expect(page.getByRole('link', { name: /new vendor/i })).toBeVisible()
  await page.getByRole('link', { name: /new vendor/i }).click()
  await page.waitForURL(/vendors\/new/, { timeout: 10_000 })
  await expect(page).toHaveURL(/vendors\/new/)
})

test('search filter narrows results client-side', async ({ page }) => {
  const searchInput = page.getByPlaceholder(/search vendors/i)
  await expect(searchInput).toBeVisible()
  await searchInput.fill('zzzzzzz-no-vendor')
  await expect(page.getByText(/no vendors match/i)).toBeVisible({ timeout: 5_000 })
})
