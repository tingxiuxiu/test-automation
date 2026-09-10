import type { WaveformJson } from "./types"

export function waveformSrc(
  search = typeof window === "undefined" ? "" : window.location.search,
  injectedSrc?: string | null,
): string {
  if (injectedSrc && injectedSrc.length > 0) return injectedSrc
  const src = new URLSearchParams(search).get("src")
  return src && src.length > 0 ? src : "./sample.json"
}

function reportOrigins(): string[] {
  const origins = new Set<string>()
  const add = (origin?: string) => {
    if (origin && origin !== "null") origins.add(origin)
  }
  if (typeof location !== "undefined") add(location.origin)
  if (typeof window !== "undefined") {
    try {
      add(window.opener?.location?.origin)
    } catch {
      /* cross-origin opener */
    }
    try {
      if (window.parent !== window) add(window.parent.location.origin)
    } catch {
      /* cross-origin parent */
    }
  }
  if (typeof document !== "undefined" && document.referrer) {
    try {
      add(new URL(document.referrer).origin)
    } catch {
      /* ignore */
    }
  }
  return [...origins]
}

export function sidecarUrls(src: string): string[] {
  const name = src.split("/").pop() || src
  const urls = [src, `data/attachments/${name}`, `data/attachments/${name}?attachment`]
  for (const origin of reportOrigins()) {
    urls.push(`${origin}/data/attachments/${name}`)
    urls.push(`${origin}/data/attachments/${name}?attachment`)
  }
  if (typeof document !== "undefined") {
    try {
      urls.push(new URL(src, document.baseURI).href)
    } catch {
      /* ignore */
    }
  }
  return [...new Set(urls)]
}

export function dropInjectedPayload(target?: { __WAVEFORM__?: WaveformJson }) {
  const bag = target ?? (typeof window === "undefined" ? undefined : window)
  if (bag) bag.__WAVEFORM__ = undefined
}

export async function loadWaveformJson(): Promise<WaveformJson> {
  const injected = window.__WAVEFORM__
  if (injected) {
    const json = injected
    dropInjectedPayload()
    return json
  }
  const src = waveformSrc(window.location.search, window.__WAVEFORM_SRC__)
  const errors: string[] = []
  for (const url of sidecarUrls(src)) {
    try {
      const r = await fetch(url)
      if (!r.ok) {
        errors.push(`${url} ${r.status}`)
        continue
      }
      const json = (await r.json()) as WaveformJson
      if (json && typeof json.sampleCount === "number") return json
      errors.push(`${url} not waveform json`)
    } catch (e) {
      errors.push(`${url} ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  throw new Error(errors.join("; ") || `failed to load ${src}`)
}
