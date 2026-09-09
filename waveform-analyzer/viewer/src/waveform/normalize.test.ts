import { describe, expect, it } from "vitest"
import { channelStats, imbalancePercent } from "./stats"
import { normalizeWaveform } from "./normalize"
import { timeAt } from "./timeline"

describe("channelStats", () => {
  it("skips NaN and matches hand RMS", () => {
    const st = channelStats([3, 4, Number.NaN])
    expect(st.peak).toBe(4)
    expect(st.min).toBe(3)
    expect(st.peakPeak).toBe(1)
    expect(st.average).toBe(3.5)
    expect(st.rms).toBeCloseTo(3.5355339059327378, 12)
    expect(st.crestFactor).toBeCloseTo(1.1313708498984762, 12)
    expect(st.thd).toBeNull()
  })
})

describe("imbalancePercent", () => {
  it("is max deviation over mean RMS", () => {
    expect(imbalancePercent([220.1, 221.0, 219.4])).toBeCloseTo(0.3785, 4)
  })
})

describe("normalizeWaveform", () => {
  it("pads short channels with NaN and does not invent zeros", () => {
    const n = normalizeWaveform({
      sampleCount: 4,
      samplingRate: 1000,
      voltage: { Va: [1, 2] },
    })
    expect(Array.from(n.groups.voltage.Va)).toEqual([1, 2, Number.NaN, Number.NaN])
    expect(n.groups.voltage.Va[2]).not.toBe(0)
    expect(n.warnings.some((w) => w.channel === "Va" && w.actual === 2)).toBe(true)
    expect(timeAt(n.timeline, 1)).toBeCloseTo(0.001)
  })
})
