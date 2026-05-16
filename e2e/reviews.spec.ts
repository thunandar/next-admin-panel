import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/reviews')
})

test('reviews page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Reviews', exact: true })).toBeVisible()
})

test('rating tabs are present and clickable', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /5 stars/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /1 star/i }).click()
  await page.waitForLoadState('networkidle')
  await page.getByRole('tab', { name: /^all/i }).click()
})

test('search by product input is visible', async ({ page }) => {
  await expect(page.getByPlaceholder(/search by product/i)).toBeVisible()
})

test('expected column headers are visible', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Rating' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Reviewer' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
})

test('search input updates value', async ({ page }) => {
  await page.getByPlaceholder(/search by product/i).fill('test')
  await expect(page.getByPlaceholder(/search by product/i)).toHaveValue('test')
})
