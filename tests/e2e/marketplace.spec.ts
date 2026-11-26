import { expect, test } from "@playwright/test"

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
  // Count-agnostic: every run leaves rows behind, so the Electronics total
  // grows over time (see the note about the missing DELETE policy above).
  await expect(page.getByRole("status")).toContainText("listing")

  await page.getByRole("link", { name: "Vehicles" }).click()
  await expect(page).toHaveURL(/\?category=vehicles$/)
  await expect(page.getByText("No listings yet")).toBeVisible()

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
