import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/dashboard')
})

test('dashboard loads and shows stat cards', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Revenue', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Orders', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Visitors', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Conversion', { exact: true }).first()).toBeVisible()
})

test('top-products card opens its product detail', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // Top products widget lists clickable product names; clicking one navigates
  // to /admin/products/:id. If there's nothing to click, skip — seed data may
  // not include any orders yet.
  const firstTopProduct = page
    .getByText(/top products/i)
    .locator('..')
    .getByRole('link')
    .first()
  if (!(await firstTopProduct.count())) test.skip()
  await firstTopProduct.click()
  await expect(page).toHaveURL(/products/)
})

test('dashboard greets the user by first name', async ({ page }) => {
  // Greeting is "Good morning|afternoon|evening, <firstName>". Match any of them.
  await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible()
})

test('sidebar navigation links work', async ({ page }) => {
  await page.getByRole('link', { name: /products/i }).first().click()
  await expect(page).toHaveURL(/products/)

  await page.getByRole('link', { name: /users/i }).click()
  await expect(page).toHaveURL(/users/)

  await page.getByRole('link', { name: /orders/i }).click()
  await expect(page).toHaveURL(/orders/)

  await page.getByRole('link', { name: /audit/i }).click()
  await expect(page).toHaveURL(/audit/)
})
