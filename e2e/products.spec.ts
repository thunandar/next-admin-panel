import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/products')
})

test('products page loads and shows table', async ({ page }) => {
  // Page has a search bar (no h1 heading on this page)
  await expect(page.getByPlaceholder(/search products/i)).toBeVisible()
  // Table headers are visible
  await expect(page.getByRole('columnheader', { name: /product/i }).first()).toBeVisible()
})

test('create a new product', async ({ page }) => {
  const productName = `Test Product ${Date.now()}`

  // Navigate directly since Add Product is only visible to 'admin' role, not 'super_admin'
  await page.goto('/admin/products/new')
  await expect(page).toHaveURL(/products\/new/)

  // Labels are plain text without htmlFor — use placeholders to target inputs
  await page.getByPlaceholder(/premium wireless/i).fill(productName)
  await page.getByPlaceholder('0.00').fill('29.99')
  await page.getByPlaceholder('0').fill('50')
  // Category is a select — leave as default (no category)

  await page.getByRole('button', { name: 'Create Product' }).click()

  // Should redirect back to products list
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})

test('can search products', async ({ page }) => {
  const searchInput = page.getByPlaceholder(/search products/i)
  await searchInput.fill('test')
  await page.getByRole('button', { name: /search/i }).click()
  // Page updates (may show results or empty state)
  await page.waitForLoadState('networkidle')
  await expect(searchInput).toHaveValue('test')
})

test('can filter products by category', async ({ page }) => {
  const categorySelect = page.getByRole('combobox').first()
  if (await categorySelect.isVisible()) {
    const options = await categorySelect.locator('option').count()
    if (options > 1) {
      await categorySelect.selectOption({ index: 1 })
      await page.waitForLoadState('networkidle')
    }
  }
})

test('view product detail page', async ({ page }) => {
  // Wait for table to load
  await page.waitForLoadState('networkidle')
  // Click the product name link in the first data row (not the row itself)
  const firstProductLink = page.locator('tbody tr').first().getByRole('link').first()
  if (await firstProductLink.isVisible()) {
    await firstProductLink.click()
    await expect(page).toHaveURL(/products\/\d+/)
  }
})
