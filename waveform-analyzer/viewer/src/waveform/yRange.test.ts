import { describe, expect, it } from "vitest"
import { seriesYRange } from "./yRange"

describe("seriesYRange", () => {
  it("uses full-record extrema unless followWindow", () => {
    const y = new Float64Array([0, 10, 1, 1])
    const full = seriesYRange([y], { i0: 2, i1: 3 }, false)!
    expect(full.max).toBeGreaterThan(9)
    const win = seriesYRange([y], { i0: 2, i1: 3 }, true)!
    expect(win.max).toBeLessThan(3)
  })
})
