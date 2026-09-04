import { describe, expect, it } from "vitest"
import { normalizeWaveform } from "./normalize"
import { useWaveformStore } from "./store"
import { boxZoom } from "./viewRange"

describe("store view history", () => {
  it("undo returns to the previous window", () => {
    const data = normalizeWaveform({
      sampleCount: 100,
      samplingRate: 1000,
      voltage: { Uu: Array.from({ length: 100 }, (_, i) => i) },
    })
    useWaveformStore.getState().setData(data)
    const full = useWaveformStore.getState().view
    expect(full).toEqual({ i0: 0, i1: 99 })
    useWaveformStore.getState().setView(boxZoom(full, 0.2, 0.5, 100))
    expect(useWaveformStore.getState().view.i0).toBeGreaterThan(0)
    useWaveformStore.getState().undo()
    expect(useWaveformStore.getState().view).toEqual(full)
    useWaveformStore.getState().setView(boxZoom(full, 0.1, 0.2, 100))
    useWaveformStore.getState().resetView()
    expect(useWaveformStore.getState().view).toEqual(full)
  })
})
