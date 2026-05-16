import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/vendors')
})

test('vendors page loads with header + new button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Vendors', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /new vendor/i })).toBeVisible()
})

test('shows expected column headers', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('columnheader', { name: 'Vendor' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Slug' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Website' })).toBeVisible()
})

test('status pills filter the list', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Active', exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Inactive', exact: true }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'All', exact: true }).click()
})

test('new vendor button navigates to create form', async ({ page }) => {
  await page.getByRole('link', { name: /new vendor/i }).click()
  await expect(page).toHaveURL(/vendors\/new/)
})

test('search filter narrows results client-side', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder(/search vendors/i).fill('zzzzzzz-no-vendor')
  await expect(page.getByText(/no vendors match/i)).toBeVisible({ timeout: 5_000 })
})
