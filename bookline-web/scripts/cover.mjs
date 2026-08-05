/**
 * Renders docs/cover.html to docs/cover.png - the portfolio cover image.
 *
 * Both servers must be running, because the calendar inside the poster is
 * captured live at 2x so it stays crisp when the poster scales it.
 *
 *   npm install --no-save playwright
 *   node scripts/cover.mjs
 */
import { chromium } from 'playwright'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const WEB = 'http://localhost:5173'
const API = 'https://localhost:7293'
const DOCS = path.resolve(import.meta.dirname, '../../docs')
const RETINA = path.join(tmpdir(), 'bookline-calendar-2x.png')

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const session = await (
  await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@bookline.app', password: 'demo' }),
  })
).json()

const browser = await chromium.launch()

const authed = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
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

const calendar = await authed.newPage()
await calendar.goto(`${WEB}/admin/calendar`)
await calendar.waitForSelector('button[title*="·"]', { timeout: 15000 })
await calendar.waitForTimeout(1200)
await calendar.screenshot({ path: RETINA })

const poster = await browser.newPage({ viewport: { width: 1600, height: 1200 } })
await poster.goto(pathToFileURL(path.join(DOCS, 'cover.html')).href)

// Swap in the 2x capture. Opened directly in a browser, cover.html still shows
// the committed 1x screenshot.
const retinaUrl = pathToFileURL(RETINA).href
await poster.evaluate(async (src) => {
  const image = document.querySelector('.window img')
  image.src = src
  await image.decode()
}, retinaUrl)

await poster.evaluate(() => document.fonts.ready)
await poster.waitForTimeout(300)
await poster.screenshot({ path: path.join(DOCS, 'cover.png') })

await browser.close()
console.log('✓ docs/cover.png')
