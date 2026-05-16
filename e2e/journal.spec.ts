import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin/journal')
})

test('journal admin page loads', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /editorial posts/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /new post/i })).toBeVisible()
})

test('new post button navigates to create page', async ({ page }) => {
  await page.getByRole('link', { name: /new post/i }).click()
  await expect(page).toHaveURL(/journal\/new/)
})

test('list shows expected table structure when posts exist', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const hasPosts = await page.getByRole('columnheader', { name: 'Title' }).isVisible()
  if (hasPosts) {
    await expect(page.getByRole('columnheader', { name: 'Author' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Updated' })).toBeVisible()
  } else {
    await expect(page.getByText(/no journal posts yet/i)).toBeVisible()
  }
})

test('view button on a post navigates to detail page', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  const viewBtn = page.getByRole('link', { name: /view post/i }).first()
  if (await viewBtn.isVisible()) {
    await viewBtn.click()
    await expect(page).toHaveURL(/journal\/\d+/)
  }
})

test('create a new journal post', async ({ page }) => {
  await page.goto('/admin/journal/new')
  await expect(page).toHaveURL(/journal\/new/)

  const title = `E2E Post ${Date.now()}`
  await page.getByPlaceholder(/quiet luxury of natural fibres/i).fill(title)
  await page.getByPlaceholder(/write the post/i).fill('A short body for the e2e test.')

  await page.getByRole('button', { name: /create post/i }).click()

  // Redirects to the journal list on success
  await expect(page).toHaveURL(/\/admin\/journal$/, { timeout: 10_000 })
})
