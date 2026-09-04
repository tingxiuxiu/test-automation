import { toPng } from "html-to-image"

export async function capturePng(el: HTMLElement): Promise<string> {
  const bg = getComputedStyle(el).getPropertyValue("--parchment").trim() || "#000000"
  return toPng(el, { cacheBust: true, pixelRatio: 2, backgroundColor: bg })
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}
