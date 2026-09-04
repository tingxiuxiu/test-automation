export type ChannelMeta = {
  id: string
  group: string
  pairId?: string | null
  unit?: string
}

export type LengthWarning = {
  channel: string
  expected: number
  actual: number
  message?: string
}

export type ChannelStats = {
  peak: number | null
  min: number | null
  peakPeak: number | null
  average: number | null
  rms: number | null
  crestFactor: number | null
  ripple: number | null
  thd: null
}

export type WaveformJson = {
  sampleCount: number
  samplingRate: number
  units?: Record<string, string>
  channels?: ChannelMeta[]
  warnings?: LengthWarning[]
  stats?: { full?: Record<string, ChannelStats | number | null> }
  [group: string]: unknown
}

export const NAN_RATIO_LIMIT = 0.001

export const DEFAULT_CHANNELS: ChannelMeta[] = [
  { id: "Uu", group: "voltage", pairId: "phase-U", unit: "V" },
  { id: "Vv", group: "voltage", pairId: "phase-V", unit: "V" },
  { id: "Ww", group: "voltage", pairId: "phase-W", unit: "V" },
  { id: "Iu", group: "current", pairId: "phase-U", unit: "A" },
  { id: "Iv", group: "current", pairId: "phase-V", unit: "A" },
  { id: "Iw", group: "current", pairId: "phase-W", unit: "A" },
  { id: "speed", group: "motor", pairId: null, unit: "rpm" },
  { id: "load", group: "motor", pairId: null, unit: "%" },
]
