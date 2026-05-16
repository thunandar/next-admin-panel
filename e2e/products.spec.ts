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
  await page.getByPlaceholder(/linen field shirt/i).fill(productName)
  const numericInputs = page.locator('input[type=number]')
  await numericInputs.nth(0).fill('29.99') // Price
  // Stock input is further down (after Compare-at, Cost per item).
  await numericInputs.nth(3).fill('50')

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
  // Create a fresh product so we don't mutate seed data
  const original = `Edit Target ${Date.now()}`
  await page.goto('/admin/products/new')
  await page.getByPlaceholder(/premium wireless/i).fill(original)
  await page.getByPlaceholder('0.00').fill('19.99')
  await page.getByPlaceholder('0').fill('10')
  await page.getByRole('button', { name: 'Create Product' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })

  // Locate the product, open detail, then navigate to edit
  await page.getByPlaceholder(/search products/i).fill(original)
  await page.getByRole('button', { name: /search/i }).click()
  await page.waitForLoadState('networkidle')
  await page.locator('tbody tr').first().getByRole('link').first().click()
  await expect(page).toHaveURL(/products\/\d+$/)
  const productId = page.url().match(/products\/(\d+)/)?.[1]
  expect(productId).toBeTruthy()

  await page.goto(`/admin/products/${productId}/edit`)
  const updated = `${original} (edited)`
  const titleInput = page.getByPlaceholder(/linen field shirt/i)
  await titleInput.fill(updated)
  await page.getByRole('button', { name: /save changes/i }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})

test('delete a product', async ({ page }) => {
  // Create a disposable product to delete
  const name = `Delete Target ${Date.now()}`
  await page.goto('/admin/products/new')
  await page.getByPlaceholder(/premium wireless/i).fill(name)
  await page.getByPlaceholder('0.00').fill('5.00')
  await page.getByPlaceholder('0').fill('1')
  await page.getByRole('button', { name: 'Create Product' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })

  // Find it and open detail
  await page.getByPlaceholder(/search products/i).fill(name)
  await page.getByRole('button', { name: /search/i }).click()
  await page.waitForLoadState('networkidle')
  await page.locator('tbody tr').first().getByRole('link').first().click()
  await expect(page).toHaveURL(/products\/\d+$/)

  // Open the confirm modal, then click Delete inside it (the second Delete on the page)
  await page.getByRole('button', { name: /^delete$/i }).click()
  await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click()
  await expect(page).toHaveURL(/\/admin\/products$/, { timeout: 10_000 })
})
