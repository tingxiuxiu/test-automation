import { useEffect, useRef, useState } from "react"
import { init, use } from "echarts/core"
import { LineChart } from "echarts/charts"
import { GridComponent } from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { ECharts } from "echarts/core"
import { indexAtFrac, panRange, boxZoom, zoomAt } from "../waveform/viewRange"
import { useWaveformStore } from "../waveform/store"
import type { NormalizedWaveform } from "../waveform/normalize"
import { buildChartModel } from "./chartModel"
import { chartOption } from "./echartsOption"
import { channelColor, channelFill, type ColorScheme } from "../theme"

use([LineChart, GridComponent, CanvasRenderer])

type Props = {
  group: string
  data: NormalizedWaveform
  visible: Set<string>
}

type Drag = {
  clientX0: number
  fracX0: number
  panAcc: number
  cursorTarget: "A" | "B" | null
}

function pickCursorTarget(a: number | null, b: number | null, idx: number): "A" | "B" {
  if (a == null) return "A"
  if (b == null) return "B"
  return Math.abs(idx - a) <= Math.abs(idx - b) ? "A" : "B"
}

function ChannelReadouts({
  leftPct,
  frac,
  index,
  ids,
  group,
  data,
  tag,
  preferLeft,
  scheme,
}: {
  leftPct: string
  frac: number
  index: number
  ids: string[]
  group: string
  data: NormalizedWaveform
  tag?: "A" | "B"
  preferLeft?: boolean
  scheme: ColorScheme
}) {
  const goLeft = preferLeft ? frac >= 0.28 : frac > 0.72
  return (
    <div
      className="channel-readouts"
      data-tag={tag ?? "hover"}
      style={{
        left: leftPct,
        transform: goLeft ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
      }}
    >
      {tag ? <span className="channel-readouts-tag">{tag}</span> : null}
      {ids.map((id, i) => {
        const raw = data.groups[group]?.[id]?.[index]
        const text = typeof raw === "number" && Number.isFinite(raw) ? raw.toFixed(2) : "—"
        return (
          <span
            key={id}
            className="channel-readout"
            style={{ background: channelFill(id, i, 0.22, scheme), color: channelColor(id, i, scheme) }}
          >
            {text}
          </span>
        )
      })}
    </div>
  )
}

export function ChartGroup({ group, data, visible }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)

  const view = useWaveformStore((s) => s.view)
  const yFollow = useWaveformStore((s) => s.yFollow)
  const tool = useWaveformStore((s) => s.tool)
  const cursorA = useWaveformStore((s) => s.cursorA)
  const cursorB = useWaveformStore((s) => s.cursorB)
  const hoverIndex = useWaveformStore((s) => s.hoverIndex)
  const scheme = useWaveformStore((s) => s.scheme)
  const idsKey = [...visible].sort().join(",")

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const chart = init(el, undefined, { renderer: "canvas", useDirtyRect: true })
    chartRef.current = chart
    const ro = new ResizeObserver(() => {
      chart.resize()
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [group])

  useEffect(() => {
    const chart = chartRef.current
    const el = canvasRef.current
    if (!chart || !el) return
    const model = buildChartModel(data, group, visible, view.i0, view.i1, el.clientWidth || 320, yFollow, scheme)
    chart.setOption(chartOption(model, scheme), { notMerge: true, lazyUpdate: true })
  }, [data, group, view, visible, yFollow, idsKey, scheme])

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return

    const fracOf = (clientX: number) => {
      const r = el.getBoundingClientRect()
      return Math.min(1, Math.max(0, (clientX - r.left) / Math.max(1, r.width)))
    }

    const endDrag = () => {
      dragRef.current = null
      setBox(null)
    }

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      ev.preventDefault()
      const f = fracOf(ev.clientX)
      const st = useWaveformStore.getState()
      const drag: Drag = { clientX0: ev.clientX, fracX0: f, panAcc: 0, cursorTarget: null }
      if (st.data) st.setHoverIndex(indexAtFrac(st.view, f))
      if (st.tool === "pan") st.snapshotView()
      if (st.tool === "cursor") {
        const idx = indexAtFrac(st.view, f)
        drag.cursorTarget = pickCursorTarget(st.cursorA, st.cursorB, idx)
        if (drag.cursorTarget === "A") st.setCursorA(idx)
        else st.setCursorB(idx)
        st.setHoverIndex(idx)
      }
      dragRef.current = drag
      try {
        el.setPointerCapture(ev.pointerId)
      } catch {
        /* already captured */
      }
    }

    const onMove = (ev: PointerEvent) => {
      const st = useWaveformStore.getState()
      const f = fracOf(ev.clientX)
      if (st.data) {
        const idx = indexAtFrac(st.view, f)
        st.setHoverIndex(idx)
        const start = dragRef.current
        if (st.tool === "cursor" && start?.cursorTarget === "A") st.setCursorA(idx)
        else if (st.tool === "cursor" && start?.cursorTarget === "B") st.setCursorB(idx)
      }

      const start = dragRef.current
      if (!start) return

      if (st.tool === "pan" && st.data) {
        const r = el.getBoundingClientRect()
        const span = Math.max(1, st.view.i1 - st.view.i0)
        start.panAcc += ((start.clientX0 - ev.clientX) / Math.max(1, r.width)) * span
        start.clientX0 = ev.clientX
        const step = start.panAcc > 0 ? Math.floor(start.panAcc) : Math.ceil(start.panAcc)
        if (step !== 0) {
          start.panAcc -= step
          st.setView(panRange(st.view, step, st.data.sampleCount), false)
        }
        return
      }

      if (st.tool === "box") {
        setBox({ left: Math.min(start.fracX0, f), width: Math.abs(f - start.fracX0) })
      }
    }

    const onUp = (ev: PointerEvent) => {
      const start = dragRef.current
      endDrag()
      if (!start || !data) return
      const st = useWaveformStore.getState()
      const f1 = fracOf(ev.clientX)
      if (st.tool === "box" && Math.abs(f1 - start.fracX0) > 0.008) {
        st.setView(boxZoom(st.view, start.fracX0, f1, data.sampleCount))
      }
    }

    const onLeave = () => {
      if (dragRef.current) return
      useWaveformStore.getState().setHoverIndex(null)
    }

    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey || !data) return
      ev.preventDefault()
      const st = useWaveformStore.getState()
      st.setView(zoomAt(st.view, fracOf(ev.clientX), ev.deltaY > 0 ? 1.2 : 0.8, data.sampleCount))
    }

    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", endDrag)
    el.addEventListener("pointerleave", onLeave)
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", endDrag)
      el.removeEventListener("pointerleave", onLeave)
      el.removeEventListener("wheel", onWheel)
    }
  }, [data])

  const dt = 1 / data.samplingRate
  const t0 = view.i0 * dt
  const t1 = view.i1 * dt
  const fracOfIndex = (i: number | null) => {
    if (i == null || t1 === t0) return null
    const f = (i * dt - t0) / (t1 - t0)
    if (f < 0 || f > 1) return null
    return f
  }

  const hoverFrac = fracOfIndex(hoverIndex)
  const hoverPct = hoverFrac == null ? null : `${hoverFrac * 100}%`
  const aFrac = fracOfIndex(cursorA)
  const bFrac = fracOfIndex(cursorB)
  const showHover = hoverPct != null && hoverIndex !== cursorA && hoverIndex !== cursorB
  const groupIds = Object.keys(data.groups[group] ?? {}).filter((id) => visible.has(id))

  return (
    <div className="plot-host">
      <div ref={canvasRef} className="plot-canvas" />
      <div ref={overlayRef} className="plot-overlay" data-tool={tool} />
      {box ? <div className="box-select" style={{ left: `${box.left * 100}%`, width: `${box.width * 100}%` }} /> : null}
      {showHover ? <div className="cursor-line cursor-line-follow" style={{ left: hoverPct! }} /> : null}
      {showHover && hoverIndex != null && hoverPct != null && hoverFrac != null ? (
        <ChannelReadouts
          leftPct={hoverPct}
          frac={hoverFrac}
          index={hoverIndex}
          ids={groupIds}
          group={group}
          data={data}
          scheme={scheme}
        />
      ) : null}
      {aFrac != null && cursorA != null ? (
        <>
          <div className="cursor-line cursor-line-a" style={{ left: `${aFrac * 100}%` }} />
          <ChannelReadouts
            leftPct={`${aFrac * 100}%`}
            frac={aFrac}
            index={cursorA}
            ids={groupIds}
            group={group}
            data={data}
            scheme={scheme}
            tag="A"
            preferLeft
          />
        </>
      ) : null}
      {bFrac != null && cursorB != null ? (
        <>
          <div className="cursor-line cursor-line-b" style={{ left: `${bFrac * 100}%` }} />
          <ChannelReadouts
            leftPct={`${bFrac * 100}%`}
            frac={bFrac}
            index={cursorB}
            ids={groupIds}
            group={group}
            data={data}
            scheme={scheme}
            tag="B"
          />
        </>
      ) : null}
    </div>
  )
}
