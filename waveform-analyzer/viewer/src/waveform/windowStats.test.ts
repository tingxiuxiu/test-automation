import { describe, expect, it } from "vitest"
import { channelStats } from "./stats"
import { computeWindowStats } from "./windowStats"

describe("windowStats", () => {
  it("matches channelStats on the AB slice", () => {
    const y = new Float64Array([0, 3, 4, 10, 0])
    const w = computeWindowStats({ voltage: { Uu: y } }, 1, 2)
    expect(w.channels.Uu).toEqual(channelStats([3, 4]))
    expect(w.channels.Uu.rms).toBeCloseTo(3.5355339059327378, 12)
  })
})
