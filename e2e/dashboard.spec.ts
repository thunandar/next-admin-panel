import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/dashboard')
})

test('dashboard loads and shows stat cards', async ({ page }) => {
  await expect(page.getByText('Total Revenue')).toBeVisible()
  await expect(page.getByText('Total Orders')).toBeVisible()
  await expect(page.getByText('Pending Orders')).toBeVisible()
  await expect(page.getByText('Total Users')).toBeVisible()
  await expect(page.getByText('Total Products')).toBeVisible()
})

test('stat cards link to correct pages', async ({ page }) => {
  await page.getByText('Total Products').click()
  await expect(page).toHaveURL(/products/)
})

test('dashboard shows welcome message with user name', async ({ page }) => {
  await expect(page.getByText('Welcome back,')).toBeVisible()
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
