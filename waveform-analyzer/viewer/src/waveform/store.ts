import { create } from "zustand"
import type { NormalizedWaveform } from "./normalize"
import { fullRange, type SampleRange } from "./viewRange"
import { pairsFromChannels } from "./pairs"
import { persistScheme, readStoredScheme, type ColorScheme } from "../theme"

export type Tool = "box" | "pan" | "cursor"

type Store = {
  data: NormalizedWaveform | null
  view: SampleRange
  history: SampleRange[]
  tool: Tool
  yFollow: boolean
  hiddenPairs: string[]
  cursorA: number | null
  cursorB: number | null
  hoverIndex: number | null
  scheme: ColorScheme
  setData: (data: NormalizedWaveform) => void
  setTool: (tool: Tool) => void
  setView: (view: SampleRange, pushHistory?: boolean) => void
  snapshotView: () => void
  undo: () => void
  resetView: () => void
  togglePair: (pairId: string) => void
  setYFollow: (v: boolean) => void
  setCursorA: (i: number | null) => void
  setCursorB: (i: number | null) => void
  setHoverIndex: (i: number | null) => void
  setScheme: (scheme: ColorScheme) => void
}

export const useWaveformStore = create<Store>((set, get) => ({
  data: null,
  view: { i0: 0, i1: 0 },
  history: [],
  tool: "box",
  yFollow: false,
  hiddenPairs: [],
  cursorA: null,
  cursorB: null,
  hoverIndex: null,
  scheme: readStoredScheme(),
  setData: (data) =>
    set({
      data,
      view: fullRange(data.sampleCount),
      history: [],
      hiddenPairs: [],
      cursorA: null,
      cursorB: null,
      hoverIndex: null,
    }),
  setTool: (tool) => set({ tool, hoverIndex: null }),
  setView: (view, pushHistory = true) => {
    const { view: prev, history } = get()
    set({
      view,
      history: pushHistory ? [...history, prev].slice(-40) : history,
    })
  },
  snapshotView: () => {
    const { view, history } = get()
    set({ history: [...history, view].slice(-40) })
  },
  undo: () => {
    const { history } = get()
    if (!history.length) return
    const view = history[history.length - 1]
    set({ view, history: history.slice(0, -1) })
  },
  resetView: () => {
    const n = get().data?.sampleCount ?? 0
    set({ view: fullRange(n) })
  },
  togglePair: (pairId) => {
    const hidden = new Set(get().hiddenPairs)
    if (hidden.has(pairId)) hidden.delete(pairId)
    else hidden.add(pairId)
    set({ hiddenPairs: [...hidden] })
  },
  setYFollow: (yFollow) => set({ yFollow }),
  setCursorA: (cursorA) => set({ cursorA }),
  setCursorB: (cursorB) => set({ cursorB }),
  setHoverIndex: (hoverIndex) => set({ hoverIndex }),
  setScheme: (scheme) => {
    persistScheme(scheme)
    set({ scheme })
  },
}))

export function currentPairs() {
  const data = useWaveformStore.getState().data
  return data ? pairsFromChannels(data.channels) : []
}
