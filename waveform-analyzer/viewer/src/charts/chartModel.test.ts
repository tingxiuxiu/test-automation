import { describe, expect, it } from "vitest"
import { buildChartModel } from "./chartModel"
import type { NormalizedWaveform } from "../waveform/normalize"

function waveform(y: number[]): NormalizedWaveform {
  return {
    sampleCount: y.length,
    samplingRate: 1000,
    units: {},
    channels: [{ id: "Uu", group: "voltage" }],
    warnings: [],
    groups: { voltage: { Uu: Float64Array.from(y) } },
    durationSeconds: y.length / 1000,
    statsFull: {},
  }
}

describe("buildChartModel", () => {
  it("keeps a spike in the max envelope trace", () => {
    const y = Array.from({ length: 2000 }, () => 0)
    y[500] = 100
    const model = buildChartModel(waveform(y), "voltage", new Set(["Uu"]), 0, 1999, 10, false)
    const maxY = Math.max(...model.traces.flatMap((t) => t.points.map((p) => p[1] ?? -Infinity)))
    expect(maxY).toBe(100)
    expect(model.traces.some((t) => t.id === "Uu")).toBe(true)
  })

  it("omits hidden channels", () => {
    const model = buildChartModel(waveform([1, 2, 3]), "voltage", new Set(), 0, 2, 64, false)
    expect(model.traces).toHaveLength(0)
  })
})
