import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/refunds')
})

test('refunds page loads with KPI stats', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Refunds', exact: true })).toBeVisible()
  await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/total refund records/i)).toBeVisible()
})

test('status tabs filter the table', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /^pending$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /^approved$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /^rejected$/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /^all$/i }).click()
})

test('new refund modal opens and closes', async ({ page }) => {
  await page.getByRole('button', { name: /new refund/i }).click()
  await expect(page.getByRole('heading', { name: /issue a refund/i })).toBeVisible()
  // Create button disabled until fields filled
  await expect(page.getByRole('button', { name: /create refund/i })).toBeDisabled()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: /issue a refund/i })).toBeHidden()
})

test('refund table headers are visible', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('columnheader', { name: 'Refund' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Order' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
})
