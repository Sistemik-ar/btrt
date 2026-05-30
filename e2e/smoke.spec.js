import { test, expect } from '@playwright/test'

test.describe('Smoke público', () => {
  test('landing carga con hero y CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Bandurrias Trail Running/i)
    // Hero
    await expect(page.locator('.bw-hero-title')).toContainText(/La Montaña/i)
    // Nav CTA → login
    await expect(page.locator('.bw-nav-cta').first()).toBeVisible()
  })

  test('SEO: meta description + JSON-LD presentes', async ({ page }) => {
    await page.goto('/')
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toMatch(/trail running/i)
    const ld = await page.locator('script[type="application/ld+json"]').textContent()
    expect(ld).toContain('SportsActivityLocation')
    expect(ld).toContain('España')
  })

  test('planes y FAQ visibles', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#planes')).toBeVisible()
    await expect(page.locator('.bw-plan-name').first()).toContainText(/Iniciación/i)
    await expect(page.locator('#faq')).toBeVisible()
  })

  test('contacto lleva a Instagram (no mail)', async ({ page }) => {
    await page.goto('/')
    const igLinks = page.locator('a[href*="instagram.com/bandurriastrailrunning"]')
    expect(await igLinks.count()).toBeGreaterThan(0)
    // no debe haber mailto en CTA
    expect(await page.locator('a[href^="mailto:"]').count()).toBe(0)
  })

  test('botón Ingresar navega a /login con opciones de acceso', async ({ page }) => {
    await page.goto('/')
    await page.locator('.bw-nav-cta').first().click()
    await expect(page).toHaveURL(/\/login$/)
    // pantalla de login: toggle Google/Email visible
    await expect(page.getByRole('button', { name: 'Email' })).toBeVisible({ timeout: 10_000 })
    // al cambiar a Email aparece el input
    await page.getByRole('button', { name: 'Email' }).click()
    await expect(page.getByPlaceholder(/roco@gmail/i)).toBeVisible()
  })

  test('ruta de app sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/inicio')
    await expect(page).toHaveURL(/\/login$/)
  })
})
