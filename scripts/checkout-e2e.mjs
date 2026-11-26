/**
 * End-to-end payment probe against a deployed Marketplace.
 *
 *   node --env-file=.env.local scripts/checkout-e2e.mjs
 *
 * Creates a listing owned by an already-onboarded seller, opens the real Buy Now
 * form, pays the hosted Stripe Checkout with the sandbox card
 * `4242 4242 4242 4242`, then asserts the success page, the `orders` row and the
 * Sold flag. Requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the
 * environment, and a seller whose Connect account has `charges_enabled`.
 *
 * Writes four screenshots to docs/screenshots: `buy-now.png` (the listing with
 * the Buy Now card), `checkout.png` (the hosted Checkout, card filled),
 * `checkout-success.png`, and `order-supabase.png` (the saved `orders` row).
 *
 * Onboarding itself is a Stripe-hosted form and is not automated: set
 * PAY_SELLER_EMAIL to an email that already finished it (check with
 * `/api/connect/status?email=…`).
 *
 * NixOS: the Playwright-bundled Chromium cannot resolve its dynamic linker, so
 * point PAY_BROWSER_PATH at a system browser. This machine also needs an older
 * alsa-lib on LD_LIBRARY_PATH or Chromium dies with a GLIBC_2.43 error:
 *
 *   LD_LIBRARY_PATH=/nix/store/<…>-alsa-lib-1.2.13/lib \
 *   PAY_BROWSER_PATH=/etc/profiles/per-user/$USER/bin/chromium \
 *   node --env-file=.env.local scripts/checkout-e2e.mjs
 */
import { chromium } from "playwright"

const base = process.env.PAY_BASE ?? "https://arifinoid-marketplace.vercel.app"
const sellerEmail = process.env.PAY_SELLER_EMAIL ?? "rohmadarifin007@gmail.com"
const buyerEmail = process.env.PAY_BUYER_EMAIL ?? `buyer-${Date.now()}@example.com`
const price = process.env.PAY_PRICE ?? "12.34"
const stamp = Date.now()
const title = `Checkout e2e ${stamp}`

const rest = `${process.env.SUPABASE_URL}/rest/v1`
const supabaseHeaders = {
  apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
  authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY}`,
}

const result = []
function record(step, ok, detail = "") {
  result.push({ step, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`)
}

const browser = await chromium.launch({
  args: ["--no-sandbox"],
  executablePath: process.env.PAY_BROWSER_PATH,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.setDefaultTimeout(30_000)

// 1. A listing owned by the onboarded seller.
const created = await fetch(`${base}/api/listings`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    title,
    description: "A listing created to exercise a real Stripe Checkout payment.",
    price,
    category: "electronics",
    seller_email: sellerEmail,
    image_url: `https://picsum.photos/seed/${stamp}/600/400`,
  }),
})
const createdBody = await created.json()
const listingId = createdBody?.data?.id
record("create listing", created.status === 201 && Boolean(listingId), listingId ?? JSON.stringify(createdBody))

const detailBody = await (await fetch(`${base}/api/listings/${listingId}`)).json()
record(
  "seller is checkout-ready",
  detailBody?.data?.sellerReady === true,
  `sellerReady=${detailBody?.data?.sellerReady}`,
)

// 2. Buy Now on the real page.
await page.goto(`${base}/item/${listingId}`, { waitUntil: "networkidle" })
await page.getByLabel("Buyer email").fill(buyerEmail)
await page.screenshot({ path: "docs/screenshots/buy-now.png", fullPage: true })
await Promise.all([
  page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 }),
  page.getByRole("button", { name: "Buy Now" }).click(),
])
record("Buy Now opens Stripe Checkout", /checkout\.stripe\.com/.test(page.url()))

// 3. Pay the hosted page. The card fields live in Stripe's Payment Element
// iframe, which is a different origin from checkout.stripe.com.
const payment = page.frameLocator('iframe[src*="elements-inner-habanero"]')
await payment.locator("input#payment-numberInput").waitFor({ timeout: 60_000 })

const currency = page.frameLocator('iframe[src*="elements-inner-currency-selector"]')
const usdRadio = currency.locator("input#currency-usd")
if ((await usdRadio.count()) > 0 && !(await usdRadio.isChecked())) {
  // The radio sits behind a custom toggle, so click the input itself rather
  // than relying on hit-testing.
  await usdRadio.evaluate((node) => node.click())
  await page.waitForTimeout(2_000)
}

await payment.locator("input#payment-numberInput").fill("4242424242424242")
await payment.locator("input#payment-expiryInput").fill("12/34")
await payment.locator("input#payment-cvcInput").fill("123")
await payment.locator("input#payment-nameInput").fill("Test Buyer")
await page.screenshot({ path: "docs/screenshots/checkout.png", fullPage: true })

/** Stripe moves the submit button between frames depending on the layout. */
async function findPayButton() {
  const candidates = []
  const top = page.locator("button")
  for (let index = 0; index < (await top.count()); index += 1) {
    candidates.push(top.nth(index))
  }
  for (const frame of page.frames()) {
    const buttons = frame.locator("button")
    for (let index = 0; index < (await buttons.count()); index += 1) {
      candidates.push(buttons.nth(index))
    }
  }
  const labelled = []
  for (const button of candidates) {
    const text = ((await button.textContent().catch(() => "")) ?? "").trim()
    if (/^pay\b/i.test(text)) {
      // "Pay" is the card submit; "Pay securely with …" is an express-checkout
      // button that opens its own sheet.
      labelled.push({ button, rank: text.toLowerCase() === "pay" ? 0 : 1 })
    }
  }
  labelled.sort((a, b) => a.rank - b.rank)
  return labelled.length > 0 ? labelled[0].button : null
}

const payButton = await findPayButton()
record("checkout shows a pay button", Boolean(payButton))
if (!payButton) throw new Error("no pay button found on the Checkout page")
await payButton.click()

// 4. Stripe sends the buyer back, possibly a beat before the order webhook.
await page.waitForURL(/\/checkout\/success/, { timeout: 120_000 })
await page.getByText("Payment confirmed").waitFor({ timeout: 120_000 })
record("success page confirms the payment", true, page.url())

const orders = await (
  await fetch(`${rest}/orders?listing_id=eq.${listingId}&select=*`, { headers: supabaseHeaders })
).json()
const order = Array.isArray(orders) ? orders[0] : undefined
const amountCents = Math.round(Number(price) * 100)
const feeCents = Math.round(amountCents * 0.1)
record(
  "order row saved with the 10% fee",
  Boolean(order) && order.amount_cents === amountCents && order.fee_cents === feeCents,
  order
    ? `${order.amount_cents}c + ${order.fee_cents}c fee, status=${order.status}`
    : "no row",
)

const after = await (await fetch(`${base}/api/listings/${listingId}`)).json()
record("listing shows as Sold", after?.data?.sold === true, `sold=${after?.data?.sold}`)

// A readable capture of the row Supabase actually holds — the tables are
// INSERT-only, so this is the same view the SQL editor would give.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]))
const orderRows = Object.entries(order ?? {})
  .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`)
  .join("")
const orderSource = `${rest}/orders?listing_id=eq.${listingId}&select=*`
const orderPage = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await orderPage.setContent(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Supabase · orders</title>
<style>
  body { margin: 0; padding: 40px; background: #f6f8fa; color: #111827;
         font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p { margin: 0 0 24px; color: #4b5563; font-family: ui-monospace, monospace; font-size: 12px; }
  table { border-collapse: collapse; width: 100%; background: #fff;
          border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb;
           font-family: ui-monospace, monospace; font-size: 13px; vertical-align: top; }
  th { width: 240px; color: #374151; background: #f9fafb; font-weight: 600; }
  tr:last-child th, tr:last-child td { border-bottom: 0; }
</style></head><body>
<h1>Supabase · public.orders</h1>
<p>${escapeHtml(orderSource)}</p>
<table>${orderRows || '<tr><th>status</th><td>no row saved</td></tr>'}</table>
</body></html>`)
await orderPage.screenshot({ path: "docs/screenshots/order-supabase.png", fullPage: true })
await orderPage.close()

await page.screenshot({ path: "docs/screenshots/checkout-success.png", fullPage: true })
await browser.close()

const failed = result.filter((entry) => !entry.ok)
console.log(`\n${result.length - failed.length}/${result.length} checks passed`)
if (failed.length > 0) process.exitCode = 1
