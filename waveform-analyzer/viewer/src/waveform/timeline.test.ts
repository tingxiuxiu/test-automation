import { describe, expect, it } from "vitest"
import { indexOnTimeline, parseTimeline, timeAt } from "./timeline"

describe("timeline", () => {
  it("uses t0 and dt from JSON to label sample times", () => {
    const tl = parseTimeline({ t0: 2, dt: 0.001, unit: "s" }, 4, 1000)
    expect(timeAt(tl, 0)).toBe(2)
    expect(timeAt(tl, 3)).toBeCloseTo(2.003)
    expect(indexOnTimeline(2.002, tl, 4)).toBe(2)
  })

  it("maps a per-sample array onto the x axis", () => {
    const tl = parseTimeline([10, 10.5, 11, 12], 4, 1000)
    expect(timeAt(tl, 1)).toBe(10.5)
    expect(indexOnTimeline(11, tl, 4)).toBe(2)
    expect(indexOnTimeline(11.8, tl, 4)).toBe(3)
  })
})
