import { expect, test, type Page } from "@playwright/test"

/**
 * End-to-end coverage for the four done criteria in PLAN.md. These tests talk to
 * a real Supabase project and write real rows — there is no DELETE policy, so
 * every run leaves data behind.
 */

// 1x1 transparent PNG, the smallest file the upload guard accepts.
const PHOTO = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
}

const SEEDED_TITLE = "Test listing from Claude"

interface ListingsResponse {
  data: {
    data: { title: string }[]
    total: number
  }
}

/**
 * Every run leaves rows behind (see the missing DELETE policy above), so no
 * category can be assumed empty — a hardcoded "this category has no listings"
 * assertion breaks the moment anyone posts there, and a bare count assertion
 * cannot tell a filtered grid from an unfiltered one. Compare the rendered
 * cards against the API for the requested category instead: the count fails if
 * the filter stops restricting parent rows, and the titles fail if the wrong
 * rows leak in.
 */
async function expectGridMatchesCategory(page: Page, category: string) {
  const response = await page.request.get(`/api/listings?category=${category}`)
  expect(response.ok()).toBeTruthy()
  const body = (await response.json()) as ListingsResponse

  const cards = page.locator('section a[href^="/item/"]')
  await expect(cards).toHaveCount(body.data.data.length)

  const titles = new Set(body.data.data.map((listing) => listing.title))
  const count = await cards.count()
  for (let index = 0; index < count; index++) {
    const alt = await cards.nth(index).locator("img").getAttribute("alt")
    if (alt === null) throw new Error(`Card ${index} has no image alt text`)
    expect(titles.has(alt)).toBe(true)
  }
}

test("a visitor can browse, filter, open a listing and message the seller", async ({
  page,
}) => {
  await page.goto("/")
  await expect(
    page.getByRole("heading", { name: "Today's picks" }),
  ).toBeVisible()

  // Category filter: client-side refetch against /api/listings.
  await page.getByRole("link", { name: "Electronics" }).click()
  await expect(page).toHaveURL(/\?category=electronics$/)
  await expect(
    page.getByRole("heading", { name: "Electronics" }),
  ).toBeVisible()
  await expectGridMatchesCategory(page, "electronics")

  await page.getByRole("link", { name: "Vehicles" }).click()
  await expect(page).toHaveURL(/\?category=vehicles$/)
  await expectGridMatchesCategory(page, "vehicles")

  await page.getByRole("link", { name: "Electronics" }).click()
  const card = page.getByRole("link", { name: new RegExp(SEEDED_TITLE) })
  await expect(card).toBeVisible()
  await card.click()

  // Detail page.
  await expect(page).toHaveURL(/\/item\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    SEEDED_TITLE,
  )
  await expect(page.getByText("$42.50")).toBeVisible()
  await expect(page.getByText("claude@example.com")).toBeVisible()

  // Message Seller.
  // `exact` keeps "Message" from also matching the header's "Messages" button.
  await page
    .getByLabel("Your email", { exact: true })
    .fill(`e2e-buyer-${Date.now()}@example.com`)
  await page
    .getByLabel("Message", { exact: true })
    .fill("Is this still available?")
  await page.getByRole("button", { name: "Send" }).click()

  await expect(
    page.getByText("Message sent. The seller will reply to your email."),
  ).toBeVisible()
})

test("a visitor can create a listing with a photo", async ({ page }) => {
  const title = `E2E keyboard ${Date.now()}`
  const price = `${(Math.random() * 900 + 10).toFixed(2)}`

  await page.goto("/create/item")
  await expect(
    page.getByRole("heading", { name: "Create new listing" }),
  ).toBeVisible()

  await page.getByLabel("Title").fill(title)
  await page.getByLabel("Price").fill(price)
  await page.getByLabel("Your email").fill("e2e-seller@example.com")
  await page
    .getByLabel("Description")
    .fill("Created by the Playwright end-to-end test.")

  await page.locator("#listing-category").click()
  await page.getByRole("option", { name: "Electronics" }).click()
  await expect(page.locator("#listing-category")).toContainText("Electronics")

  await page.locator('input[type="file"]').setInputFiles(PHOTO)
  await expect(page.getByAltText("Selected photo preview")).toBeVisible()

  // `exact` keeps "Next" from also matching the Next.js Dev Tools button.
  await page.getByRole("button", { name: "Next", exact: true }).click()

  await expect(page).toHaveURL(/\/item\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(title)
  await expect(page.getByText(`$${price}`)).toBeVisible()
  await expect(page.getByText("e2e-seller@example.com")).toBeVisible()

  // This seller has never connected Stripe, so the listing must not offer a
  // checkout that would fail. `sellerReady` is what gates it.
  await expect(page.getByRole("heading", { name: "Buy it now" })).toHaveCount(0)
  const listingUrl = page.url()
  const listingId = listingUrl.slice(listingUrl.lastIndexOf("/") + 1)
  const detail = await page.request.get(`/api/listings/${listingId}`)
  expect(detail.ok()).toBeTruthy()
  const detailBody = (await detail.json()) as {
    data: { sold: boolean; sellerReady: boolean }
  }
  expect(detailBody.data.sellerReady).toBe(false)
  expect(detailBody.data.sold).toBe(false)
})

test("the shell links to Stripe onboarding", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("link", { name: "Connect with Stripe" }).click()
  await expect(page).toHaveURL(/\/connect$/)

  await expect(
    page.getByRole("heading", { name: "Connect with Stripe" }),
  ).toBeVisible()
  await expect(page.getByLabel("Seller email")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Connect with Stripe" }),
  ).toBeVisible()
})

test("the checkout pages and endpoint reject an unknown session or listing", async ({
  page,
}) => {
  // Both pages read the session back from the order store, so a bare visit is a
  // 404 rather than an empty success message.
  for (const path of ["/checkout/success", "/checkout/cancel"]) {
    const response = await page.request.get(path)
    expect(response.status()).toBe(404)
  }

  // A well-formed body for a listing that does not exist is a conflict, not a
  // checkout: the route must look the listing up before creating a session.
  const response = await page.request.post("/api/checkout", {
    data: {
      listing_id: "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e",
      buyer_email: "e2e-buyer@example.com",
    },
  })
  expect(response.status()).toBe(409)
  const body = (await response.json()) as { error: { message: string } }
  expect(body.error.message).toContain("no longer available")
})

test("the shell links to the create flow", async ({ page }) => {
  await page.goto("/")

  // Without this entry point `/create` is only reachable by typing the URL.
  await page.getByRole("link", { name: "Create new listing" }).click()
  await expect(page).toHaveURL(/\/create$/)
  await expect(
    page.getByRole("heading", { name: "Choose listing type" }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Item for sale" })).toHaveAttribute(
    "href",
    "/create/item",
  )
})
