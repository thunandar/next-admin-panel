import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/insights')
})

test('insights page loads with header', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Insights', exact: true })).toBeVisible()
})

test('KPI stat tiles are present', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Avg order value')).toBeVisible()
  await expect(page.getByText('Gross profit')).toBeVisible()
  await expect(page.getByText('Repeat customers')).toBeVisible()
  await expect(page.getByText('Fulfillment rate')).toBeVisible()
  await expect(page.getByText('Inventory value')).toBeVisible()
})

test('revenue + status mix sections render', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(/revenue · last 12 months/i)).toBeVisible()
  await expect(page.getByText(/order status mix/i)).toBeVisible()
})

test('top customers section is present', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Top customers')).toBeVisible()
})

test('operational dashboard link returns to dashboard', async ({ page }) => {
  await page.getByRole('link', { name: /operational dashboard/i }).click()
  await expect(page).toHaveURL(/dashboard/)
})
