/**
 * Captures the PLAN.md §10 shot list into docs/screenshots.
 *
 * Requires both servers running, then:
 *   npm install --no-save playwright
 *   node scripts/screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const WEB = 'http://localhost:5173'
const API = 'https://localhost:7293'
const OUT = path.resolve(import.meta.dirname, '../../docs/screenshots')

const DESKTOP = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

async function login() {
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@bookline.app', password: 'demo' }),
  })
  return response.json()
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  await mkdir(OUT, { recursive: true })

  const session = await login()
  const browser = await chromium.launch()

  const authed = await browser.newContext({
    viewport: DESKTOP,
    ignoreHTTPSErrors: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: WEB,
          localStorage: [
            { name: 'bookline.token', value: session.token },
            {
              name: 'bookline.session',
              value: JSON.stringify({
                email: session.email,
                displayName: session.displayName,
                roles: session.roles,
              }),
            },
          ],
        },
      ],
    },
  })

  const anon = await browser.newContext({ viewport: DESKTOP, ignoreHTTPSErrors: true })
  const phone = await browser.newContext({ viewport: PHONE, ignoreHTTPSErrors: true })

  const shot = async (page, name) => {
    await page.screenshot({ path: path.join(OUT, name) })
    console.log('  ✓', name)
  }

  // ── 1. Week calendar — the cover image ──────────────────────────────────
  const calendar = await authed.newPage()
  await calendar.goto(`${WEB}/admin/calendar`)
  await calendar.waitForSelector('button[title*="·"]', { timeout: 15000 })
  await calendar.waitForTimeout(1200)
  await shot(calendar, '01-week-calendar.png')

  // ── 4. Appointment drawer open over the calendar ────────────────────────
  const blocks = calendar.locator('button[title*="·"]')
  const count = await blocks.count()
  for (let i = 0; i < count; i++) {
    const block = blocks.nth(i)
    if ((await block.boundingBox())?.height ?? 0 >= 34) {
      await block.click()
      break
    }
  }
  await calendar.waitForSelector('aside:has-text("Stylist")', { timeout: 10000 })
  await calendar.waitForTimeout(900)
  await shot(calendar, '04-appointment-drawer.png')

  // ── 3. Dashboard ────────────────────────────────────────────────────────
  const dashboard = await authed.newPage()
  await dashboard.goto(`${WEB}/admin/dashboard`)
  await dashboard.waitForSelector('svg text', { timeout: 15000 })
  await dashboard.waitForTimeout(1000)
  await shot(dashboard, '03-dashboard.png')

  // ── 7. Services & staff admin ───────────────────────────────────────────
  const services = await authed.newPage()
  await services.goto(`${WEB}/admin/services`)
  await services.waitForSelector('table', { timeout: 15000 })
  await shot(services, '06-services.png')

  const staff = await authed.newPage()
  await staff.goto(`${WEB}/admin/staff`)
  await staff.waitForSelector('text=Amara Ellis', { timeout: 15000 })
  await shot(staff, '07-staff.png')

  // ── 8. Login screen ─────────────────────────────────────────────────────
  const loginPage = await anon.newPage()
  await loginPage.goto(`${WEB}/login`)
  await loginPage.waitForTimeout(900)
  await shot(loginPage, '08-login.png')

  // ── 2. Public booking, mid-flow with the availability grid visible ──────
  const booking = await anon.newPage()
  await booking.goto(WEB)
  await booking.getByRole('button', { name: /Cut & Finish/ }).click()
  await booking.getByRole('button', { name: /Anyone/ }).click()
  await booking.waitForSelector('button:has-text(":")', { timeout: 15000 })
  await booking.waitForTimeout(1000)
  await shot(booking, '02-public-availability.png')

  // ── 9. Booking details form ─────────────────────────────────────────────
  const slots = booking.locator('.grid button')
  if ((await slots.count()) > 0) {
    await slots.first().click()
    await booking.waitForSelector('text=Your name', { timeout: 10000 })
    await booking.waitForTimeout(700)
    await shot(booking, '09-booking-details.png')
  }

  // ── 5. Mobile booking flow ──────────────────────────────────────────────
  const mobile = await phone.newPage()
  await mobile.goto(WEB)
  await mobile.getByRole('button', { name: /Cut & Finish/ }).click()
  await mobile.getByRole('button', { name: /Anyone/ }).click()
  await mobile.waitForSelector('button:has-text(":")', { timeout: 15000 })
  await mobile.waitForTimeout(1000)
  await shot(mobile, '05-mobile-availability.png')

  // ── 6. Scalar API docs ──────────────────────────────────────────────────
  const scalar = await anon.newPage()
  await scalar.goto(`${API}/scalar`)
  await scalar.waitForTimeout(4000)
  await shot(scalar, '10-api-docs.png')

  await browser.close()
  console.log('\nWritten to', OUT)
}

main().catch((error) => {
  console.error('FAILED:', error)
  process.exit(1)
})
