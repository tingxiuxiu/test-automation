import { describe, expect, it } from "vitest"
import { dropInjectedPayload, sidecarUrls, waveformSrc } from "./load"

describe("waveformSrc", () => {
  it("prefers the Allure sidecar over ?src= and the default sample", () => {
    expect(waveformSrc("?src=other.json", "aa-attachment.json")).toBe("aa-attachment.json")
    expect(waveformSrc("?src=other.json")).toBe("other.json")
    expect(waveformSrc("")).toBe("./sample.json")
  })
})

describe("sidecarUrls", () => {
  it("adds Allure report attachment paths so blob/srcdoc previews can still fetch", () => {
    const urls = sidecarUrls("deadbeef-attachment.json")
    expect(urls[0]).toBe("deadbeef-attachment.json")
    expect(urls).toContain("data/attachments/deadbeef-attachment.json")
    expect(urls).toContain("data/attachments/deadbeef-attachment.json?attachment")
  })
})

describe("dropInjectedPayload", () => {
  it("clears the injected number[] payload so it can be collected", () => {
    const bag: { __WAVEFORM__?: { sampleCount: number; samplingRate: number } } = {
      __WAVEFORM__: { sampleCount: 1, samplingRate: 1 },
    }
    dropInjectedPayload(bag)
    expect(bag.__WAVEFORM__).toBeUndefined()
  })
})
