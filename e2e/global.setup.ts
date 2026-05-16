import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = 'e2e/.auth/admin.json'

const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
if (!EMAIL || !PASSWORD) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD env vars must be set before running e2e tests')

setup('authenticate as admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true })

  await page.goto('/login')
  await page.getByPlaceholder('you@nexus.shop').fill(EMAIL)
  await page.getByPlaceholder('••••••••').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL(/dashboard/, { timeout: 15_000 })
  await expect(page).toHaveURL(/dashboard/)

  await page.context().storageState({ path: authFile })
})
