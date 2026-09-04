import { envelopeSeries, minmaxColumns } from "../waveform/minmax"
import { seriesYRange } from "../waveform/yRange"
import { channelColor, type ColorScheme } from "../theme"
import type { NormalizedWaveform } from "../waveform/normalize"

export type ChartPoint = [number, number | null]

export type ChartTrace = {
  id: string
  color: string
  points: ChartPoint[]
}

export type ChartModel = {
  traces: ChartTrace[]
  xMin: number
  xMax: number
  yMin: number | null
  yMax: number | null
}

function finiteOrNull(v: number): number | null {
  return Number.isFinite(v) ? v : null
}

export function buildChartModel(
  data: NormalizedWaveform,
  group: string,
  visible: Set<string>,
  i0: number,
  i1: number,
  width: number,
  yFollow: boolean,
  scheme: ColorScheme = "dark",
): ChartModel {
  const block = data.groups[group] ?? {}
  const ids = Object.keys(block).filter((id) => visible.has(id))
  const buckets = Math.max(64, width * 2)
  const dt = 1 / data.samplingRate
  const cols = minmaxColumns(i0, i1, buckets, dt)
  const x = cols.map((c) => c.x)
  const traces: ChartTrace[] = []
  const ys: Float64Array[] = []

  ids.forEach((id, idx) => {
    const env = envelopeSeries(block[id], cols)
    const color = channelColor(id, idx, scheme)
    traces.push({
      id,
      color,
      points: x.map((t, i) => [t, finiteOrNull(env.max[i])]),
    })
    traces.push({
      id: `${id}·`,
      color,
      points: x.map((t, i) => [t, finiteOrNull(env.min[i])]),
    })
    ys.push(block[id])
  })

  const yr = seriesYRange(ys, { i0, i1 }, yFollow)
  const xMin = x[0] ?? i0 * dt
  const xMax = x[x.length - 1] ?? i1 * dt
  return {
    traces,
    xMin,
    xMax: xMax === xMin ? xMin + dt : xMax,
    yMin: yr?.min ?? null,
    yMax: yr?.max ?? null,
  }
}
