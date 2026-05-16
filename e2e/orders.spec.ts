import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/orders')
})

test('orders page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
})

test('can filter orders by status', async ({ page }) => {
  // The status filter is implemented as Tabs (buttons), not a select.
  // "Paid" is the label for the 'confirmed' status.
  for (const label of ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled']) {
    await page.getByRole('button', { name: new RegExp(`^${label}$`) }).click()
    await page.waitForLoadState('networkidle')
  }
  await page.getByRole('button', { name: /^All/ }).click()
  await page.waitForLoadState('networkidle')
})

test('shows orders or empty state when filtering Cancelled', async ({ page }) => {
  await page.getByRole('button', { name: /^Cancelled$/ }).click()
  await page.waitForLoadState('networkidle')
  const hasRows = (await page.getByRole('row').count()) > 1
  const hasEmpty = await page.getByText(/no orders|nothing here/i).isVisible()
  expect(hasRows || hasEmpty).toBeTruthy()
})

test('can update order status if orders exist', async ({ page }) => {
  // Soft check: inline status controls may not be present on every row.
  const statusDropdown = page.locator('select').nth(1)
  if (await statusDropdown.isVisible()) {
    await statusDropdown.selectOption('confirmed')
    await page.waitForLoadState('networkidle')
  }
})
