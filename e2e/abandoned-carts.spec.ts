import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/abandoned-carts')
})

test('abandoned carts page loads with header and stats', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /abandoned carts/i })).toBeVisible()
  await expect(page.getByText(/open carts/i)).toBeVisible()
  await expect(page.getByText(/potential value/i)).toBeVisible()
})

test('table headers are visible', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Items' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Value' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Started' })).toBeVisible()
})

test('shows empty state or rows', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const hasEmpty = await page.getByText(/no abandoned carts/i).isVisible()
  const hasRows = (await page.getByRole('row').count()) > 1
  expect(hasEmpty || hasRows).toBeTruthy()
})
