import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/categories')
})

test('categories page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Categories', exact: true })).toBeVisible()
  await expect(page.getByPlaceholder(/search categories/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /new category/i })).toBeVisible()
})

test('shows table with expected column headers', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Slug' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible()
})

test('search filter narrows the list client-side', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder(/search categories/i).fill('zzz-no-such-category-xyz')
  await expect(page.getByText(/no categories match/i)).toBeVisible({ timeout: 5_000 })
})

test('opens new category modal and cancels', async ({ page }) => {
  await page.getByRole('button', { name: /new category/i }).click()
  await expect(page.getByRole('heading', { name: 'New category' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'New category' })).toBeHidden()
})

test('creates a new category, then deletes it', async ({ page }) => {
  const name = `Test Cat ${Date.now()}`
  await page.getByRole('button', { name: /new category/i }).click()
  await page.getByPlaceholder(/e\.g\. apparel/i).first().fill(name)
  await page.getByRole('button', { name: 'Create' }).click()

  // Toast + row appears
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 8_000 })

  // Delete it to keep the seed data clean. Scope the confirm to the dialog so
  // it doesn't collide with the row-level "Delete <name>" button. Use a count
  // check rather than toBeHidden — multiple elements (row + edit/delete button
  // accessible names) momentarily reference the name during the optimistic
  // update, which trips strict mode.
  await page.getByRole('button', { name: `Delete ${name}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.getByRole('cell', { name, exact: true })).toHaveCount(0, { timeout: 8_000 })
})
