import { describe, expect, it } from "vitest"
import { isThinEventNotification } from "./event-notification"

describe("isThinEventNotification", () => {
  it("detects an Accounts v2 thin notification", () => {
    const body = JSON.stringify({
      id: "evt_1",
      object: "v2.core.event",
      type: "v2.core.account[requirements].updated",
      related_object: { id: "acct_1", type: "v2.core.account", url: "/v2/core/accounts/acct_1" },
    })

    expect(isThinEventNotification(body)).toBe(true)
  })

  it("rejects a classic v1 event payload", () => {
    const body = JSON.stringify({
      id: "evt_1",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_1" } },
    })

    expect(isThinEventNotification(body)).toBe(false)
  })

  it("rejects a payload with no object field", () => {
    expect(isThinEventNotification(JSON.stringify({ id: "evt_1" }))).toBe(false)
  })

  it("rejects malformed JSON instead of throwing", () => {
    expect(isThinEventNotification("not json")).toBe(false)
    expect(isThinEventNotification("")).toBe(false)
  })

  it("rejects a non-object JSON value", () => {
    expect(isThinEventNotification("null")).toBe(false)
    expect(isThinEventNotification('"v2.core.event"')).toBe(false)
  })
})
