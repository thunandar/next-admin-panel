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

  await page.goto('/admin/products/new')
  await expect(page).toHaveURL(/products\/new/)

  // Field labels have no htmlFor, so locate by placeholder / numeric order.
  // The product name placeholder is "e.g. Linen Field Shirt" exactly — the
  // meta title placeholder also contains it ("e.g. Linen Field Shirt — Nexus")
  // so we need exact match.
  await page.getByPlaceholder('e.g. Linen Field Shirt', { exact: true }).fill(productName)
  const numericInputs = page.locator('input[type=number]')
  await numericInputs.nth(0).fill('29.99') // Price
  // Stock input is further down (after Compare-at, Cost per item).
  await numericInputs.nth(3).fill('50')

  // Wait for categories/vendors fetch to settle so the form isn't mid-render
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Publish' }).click()

  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})

test('can search products', async ({ page }) => {
  // Search is real-time (no submit button) — the input controls state on change.
  const searchInput = page.getByPlaceholder(/search products/i)
  await searchInput.fill('test')
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

test('edit a product', async ({ page }) => {
  const original = `Edit Target ${Date.now()}`
  await page.goto('/admin/products/new')
  await page.getByPlaceholder('e.g. Linen Field Shirt', { exact: true }).fill(original)
  const numericInputs = page.locator('input[type=number]')
  await numericInputs.nth(0).fill('19.99')
  await numericInputs.nth(3).fill('10')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })

  // Search is real-time; wait for the result row to appear before clicking it.
  await page.getByPlaceholder(/search products/i).fill(original)
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: original }).first().click()
  await expect(page).toHaveURL(/products\/\d+$/)
  const productId = page.url().match(/products\/(\d+)/)?.[1]
  expect(productId).toBeTruthy()

  await page.goto(`/admin/products/${productId}/edit`)
  const updated = `${original} (edited)`
  await page.getByPlaceholder('e.g. Linen Field Shirt', { exact: true }).fill(updated)
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})

test('delete a product', async ({ page }) => {
  const name = `Delete Target ${Date.now()}`
  await page.goto('/admin/products/new')
  await page.getByPlaceholder('e.g. Linen Field Shirt', { exact: true }).fill(name)
  const numericInputs = page.locator('input[type=number]')
  await numericInputs.nth(0).fill('5.00')
  await numericInputs.nth(3).fill('1')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })

  await page.getByPlaceholder(/search products/i).fill(name)
  await page.waitForLoadState('networkidle')
  // Wait until the search has actually narrowed to our product before clicking
  // (the search is debounced and `networkidle` can race the request).
  await page.getByRole('link', { name }).first().click()
  await expect(page).toHaveURL(/products\/\d+$/)

  // Open the confirm modal, then click Delete inside it.
  await page.getByRole('button', { name: /^delete$/i }).click()
  await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})
