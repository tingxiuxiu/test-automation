import { describe, expect, it } from "vitest"
import { channelColor } from "./theme"

describe("channelColor", () => {
  it("uses ink traces on light and pale traces on dark", () => {
    expect(channelColor("Vv", 1, "light")).toBe("#1d1d1f")
    expect(channelColor("Vv", 1, "dark")).toBe("#f5f5f7")
    expect(channelColor("Uu", 0, "dark")).toBe("#2997ff")
    expect(channelColor("Uu", 0, "light")).toBe("#0066cc")
  })
})
