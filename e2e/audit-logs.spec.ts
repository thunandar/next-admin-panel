import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/audit-logs')
})

test('audit logs page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /audit logs/i })).toBeVisible()
})

test('can filter by entity type', async ({ page }) => {
  const entityFilter = page.getByRole('combobox')

  await entityFilter.selectOption('product')
  await page.waitForLoadState('networkidle')
  await expect(entityFilter).toHaveValue('product')

  await entityFilter.selectOption('user')
  await page.waitForLoadState('networkidle')

  await entityFilter.selectOption('order')
  await page.waitForLoadState('networkidle')

  await entityFilter.selectOption('')
  await page.waitForLoadState('networkidle')
})

test('audit log table shows correct columns', async ({ page }) => {
  // Use columnheader role to avoid matching sidebar nav links
  await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Entity' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible()
})
