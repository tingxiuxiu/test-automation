import { describe, expect, it } from "vitest"
import { columnMinMax, envelopeSeries, minmaxColumns } from "./minmax"
import { boxZoom, clampRange, fullRange, MIN_VIEW_SAMPLES, panRange, zoomAt } from "./viewRange"
import { pairsFromChannels, togglePair, visibleChannelIds } from "./pairs"

describe("minmax envelope", () => {
  it("keeps a single spike in the bucket max", () => {
    const y = new Float64Array(2000)
    y[500] = 100
    const cols = minmaxColumns(0, 1999, 10, 1)
    const { max } = envelopeSeries(y, cols)
    expect(Math.max(...max.filter(Number.isFinite))).toBe(100)
    const col = cols.find((c) => c.start <= 500 && c.end >= 500)!
    const mm = columnMinMax(y, col.start, col.end)
    expect(mm.max).toBe(100)
  })
})

describe("viewRange", () => {
  it("refuses windows narrower than 20 samples when n allows", () => {
    const r = clampRange(10, 12, 100)
    expect(r.i1 - r.i0 + 1).toBeGreaterThanOrEqual(MIN_VIEW_SAMPLES)
  })

  it("box zoom stays inside current window", () => {
    const r = boxZoom({ i0: 0, i1: 99 }, 0.2, 0.4, 100)
    expect(r.i0).toBeGreaterThanOrEqual(0)
    expect(r.i1).toBeLessThanOrEqual(99)
  })

  it("reset is full range", () => {
    expect(fullRange(194000)).toEqual({ i0: 0, i1: 193999 })
  })

  it("pan does not run past the ends", () => {
    const r = panRange({ i0: 0, i1: 39 }, -100, 200)
    expect(r.i0).toBe(0)
  })

  it("pan shifts a zoomed window", () => {
    const r = panRange({ i0: 40, i1: 79 }, 10, 200)
    expect(r).toEqual({ i0: 50, i1: 89 })
  })

  it("zoom at center shrinks span", () => {
    const r = zoomAt({ i0: 0, i1: 199 }, 0.5, 0.5, 200)
    expect(r.i1 - r.i0).toBeLessThan(199)
  })
})

describe("pairs", () => {
  it("hides both Uu and Iu together", () => {
    const pairs = pairsFromChannels([
      { id: "Uu", group: "voltage", pairId: "phase-U" },
      { id: "Iu", group: "current", pairId: "phase-U" },
      { id: "speed", group: "motor" },
    ])
    const hidden = togglePair(new Set(), "phase-U")
    const vis = visibleChannelIds(pairs, hidden)
    expect(vis.has("Uu")).toBe(false)
    expect(vis.has("Iu")).toBe(false)
    expect(vis.has("speed")).toBe(true)
  })
})
