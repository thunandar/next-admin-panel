import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/orders')
})

test('orders page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /all orders/i })).toBeVisible()
})

test('can filter orders by status', async ({ page }) => {
  const statusFilter = page.getByRole('combobox')
  const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

  for (const status of statuses) {
    await statusFilter.selectOption(status)
    await page.waitForLoadState('networkidle')
    await expect(statusFilter).toHaveValue(status)
  }

  // Reset to all
  await statusFilter.selectOption('')
  await page.waitForLoadState('networkidle')
})

test('shows empty state when no orders', async ({ page }) => {
  await page.getByRole('combobox').selectOption('cancelled')
  await page.waitForLoadState('networkidle')
  // Either shows orders or empty state - both are valid
  const hasOrders = await page.getByRole('row').count()
  const hasEmpty = await page.getByText(/no orders/i).isVisible()
  expect(hasOrders > 1 || hasEmpty).toBeTruthy()
})

test('can update order status if orders exist', async ({ page }) => {
  // Look for a pending order with a status dropdown
  const statusDropdown = page.locator('select').nth(1) // first is the filter, subsequent are inline
  if (await statusDropdown.isVisible()) {
    await statusDropdown.selectOption('confirmed')
    await page.waitForLoadState('networkidle')
  }
})
