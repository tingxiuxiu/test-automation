/// <reference types="vite/client" />

import type { WaveformJson } from "./waveform/types"

declare global {
  interface Window {
    __WAVEFORM__?: WaveformJson
    __WAVEFORM_SRC__?: string
  }
}

export {}
