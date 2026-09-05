import { useEffect, useRef, useState } from "react"
import { createPortal, flushSync } from "react-dom"
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"
import { indexAtTime, panRange, rangeFromTimes, zoomAt } from "../waveform/viewRange"
import { useWaveformStore } from "../waveform/store"
import type { NormalizedWaveform } from "../waveform/normalize"
import { buildChartModel } from "./chartModel"
import { clearSelect, plotX, posOfSample, setSelectX, timeAtClientX, toAligned, uplotOptions } from "./uplotOption"
import { channelColor, channelFill, type ColorScheme } from "../theme"

type Props = {
  group: string
  data: NormalizedWaveform
  visible: Set<string>
}

type Drag = {
  clientX0: number
  plotX0: number
  panAcc: number
  cursorTarget: "A" | "B" | null
}

function pickCursorTarget(a: number | null, b: number | null, idx: number): "A" | "B" {
  if (a == null) return "A"
  if (b == null) return "B"
  return Math.abs(idx - a) <= Math.abs(idx - b) ? "A" : "B"
}

function ChannelReadouts({
  leftPx,
  frac,
  index,
  ids,
  group,
  data,
  tag,
  preferLeft,
  scheme,
}: {
  leftPx: number
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
        left: leftPx,
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
  const plotRef = useRef<uPlot | null>(null)
  const seriesKeyRef = useRef("")
  const dragRef = useRef<Drag | null>(null)
  const eventsRef = useRef<AbortController | null>(null)
  const [over, setOver] = useState<HTMLDivElement | null>(null)
  const [, setPlotGen] = useState(0)

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

    const attach = (plot: uPlot) => {
      eventsRef.current?.abort()
      const ac = new AbortController()
      eventsRef.current = ac
      const { signal } = ac
      const hit = plot.over
      const fs = data.samplingRate
      const n = data.sampleCount

      const idxAt = (clientX: number) => indexAtTime(timeAtClientX(plot, clientX), fs, n)

      const endDrag = () => {
        clearSelect(plot)
        dragRef.current = null
      }

      hit.addEventListener(
        "pointerdown",
        (ev: PointerEvent) => {
          if (ev.button !== 0) return
          ev.preventDefault()
          const st = useWaveformStore.getState()
          const x = plotX(plot, ev.clientX)
          const drag: Drag = { clientX0: ev.clientX, plotX0: x, panAcc: 0, cursorTarget: null }
          if (st.data) st.setHoverIndex(idxAt(ev.clientX))
          if (st.tool === "pan") st.snapshotView()
          if (st.tool === "cursor") {
            const idx = idxAt(ev.clientX)
            drag.cursorTarget = pickCursorTarget(st.cursorA, st.cursorB, idx)
            if (drag.cursorTarget === "A") st.setCursorA(idx)
            else st.setCursorB(idx)
            st.setHoverIndex(idx)
          }
          dragRef.current = drag
          try {
            hit.setPointerCapture(ev.pointerId)
          } catch {
            /* already captured */
          }
        },
        { signal, capture: true },
      )

      hit.addEventListener(
        "pointermove",
        (ev: PointerEvent) => {
          const st = useWaveformStore.getState()
          if (st.data) {
            const idx = idxAt(ev.clientX)
            st.setHoverIndex(idx)
            const start = dragRef.current
            if (st.tool === "cursor" && start?.cursorTarget === "A") st.setCursorA(idx)
            else if (st.tool === "cursor" && start?.cursorTarget === "B") st.setCursorB(idx)
          }
          const start = dragRef.current
          if (!start) return
          if (st.tool === "pan" && st.data) {
            const t0 = timeAtClientX(plot, start.clientX0)
            const t1 = timeAtClientX(plot, ev.clientX)
            start.panAcc += (t0 - t1) * st.data.samplingRate
            start.clientX0 = ev.clientX
            const step = start.panAcc > 0 ? Math.floor(start.panAcc) : Math.ceil(start.panAcc)
            if (step !== 0) {
              start.panAcc -= step
              st.setView(panRange(st.view, step, st.data.sampleCount), false)
            }
            return
          }
          if (st.tool === "box") setSelectX(plot, start.plotX0, plotX(plot, ev.clientX))
        },
        { signal, capture: true },
      )

      hit.addEventListener(
        "pointerup",
        (ev: PointerEvent) => {
          const start = dragRef.current
          endDrag()
          if (!start) return
          const st = useWaveformStore.getState()
          if (st.tool !== "box") return
          const t0 = plot.posToVal(start.plotX0, "x")
          const t1 = timeAtClientX(plot, ev.clientX)
          if (Math.abs(plotX(plot, ev.clientX) - start.plotX0) > 4) {
            st.setView(rangeFromTimes(t0, t1, fs, n))
          }
        },
        { signal, capture: true },
      )

      hit.addEventListener("pointercancel", endDrag, { signal, capture: true })
      hit.addEventListener(
        "pointerleave",
        () => {
          if (dragRef.current) return
          useWaveformStore.getState().setHoverIndex(null)
        },
        { signal },
      )
      hit.addEventListener(
        "wheel",
        (ev: WheelEvent) => {
          if (!ev.ctrlKey) return
          ev.preventDefault()
          const st = useWaveformStore.getState()
          const min = plot.scales.x.min
          const max = plot.scales.x.max
          if (min == null || max == null || max === min) return
          const frac = (timeAtClientX(plot, ev.clientX) - min) / (max - min)
          st.setView(zoomAt(st.view, frac, ev.deltaY > 0 ? 1.2 : 0.8, n))
        },
        { signal, passive: false },
      )
    }

    const draw = () => {
      const w = Math.max(32, el.clientWidth)
      const h = Math.max(32, el.clientHeight)
      const model = buildChartModel(data, group, visible, view.i0, view.i1, w, yFollow, scheme)
      const key = `${scheme}|${model.traces.map((t) => `${t.id}:${t.color}`).join("|")}`
      const aligned = toAligned(model)
      let plot = plotRef.current
      if (!plot || seriesKeyRef.current !== key) {
        eventsRef.current?.abort()
        flushSync(() => setOver(null))
        plot?.destroy()
        plot = new uPlot(uplotOptions(model, scheme, w, h), aligned, el)
        plotRef.current = plot
        seriesKeyRef.current = key
        setOver(plot.over)
      } else {
        plot.setSize({ width: w, height: h })
        plot.setData(aligned, false)
        plot.setScale("x", { min: model.xMin, max: model.xMax })
        if (model.yMin != null && model.yMax != null) plot.setScale("y", { min: model.yMin, max: model.yMax })
        else plot.redraw()
      }
      attach(plot)
      setPlotGen((n) => n + 1)
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(el)
    return () => {
      ro.disconnect()
      eventsRef.current?.abort()
    }
  }, [data, group, view, visible, yFollow, idsKey, scheme])

  useEffect(() => {
    return () => {
      eventsRef.current?.abort()
      setOver(null)
      plotRef.current?.destroy()
      plotRef.current = null
      seriesKeyRef.current = ""
    }
  }, [group])

  useEffect(() => {
    if (over) over.dataset.tool = tool
  }, [over, tool])

  const fs = data.samplingRate
  const plot = plotRef.current
  const plotW = plot?.over.clientWidth || 1
  const hoverPx = plot && hoverIndex != null ? posOfSample(plot, hoverIndex, fs) : null
  const aPx = plot && cursorA != null ? posOfSample(plot, cursorA, fs) : null
  const bPx = plot && cursorB != null ? posOfSample(plot, cursorB, fs) : null
  const showHover = hoverPx != null && hoverIndex != null && hoverIndex !== cursorA && hoverIndex !== cursorB
  const groupIds = Object.keys(data.groups[group] ?? {}).filter((id) => visible.has(id))

  const marks =
    over == null ? null : (
      <div className="plot-layer">
        {showHover && hoverIndex != null && hoverPx != null ? (
          <>
            <div className="cursor-line cursor-line-follow" style={{ left: hoverPx }} />
            <ChannelReadouts
              leftPx={hoverPx}
              frac={hoverPx / plotW}
              index={hoverIndex}
              ids={groupIds}
              group={group}
              data={data}
              scheme={scheme}
            />
          </>
        ) : null}
        {aPx != null && cursorA != null ? (
          <>
            <div className="cursor-line cursor-line-a" style={{ left: aPx }} />
            <ChannelReadouts
              leftPx={aPx}
              frac={aPx / plotW}
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
        {bPx != null && cursorB != null ? (
          <>
            <div className="cursor-line cursor-line-b" style={{ left: bPx }} />
            <ChannelReadouts
              leftPx={bPx}
              frac={bPx / plotW}
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

  return (
    <div className="plot-host">
      <div ref={canvasRef} className="plot-canvas" />
      {over && marks ? createPortal(marks, over) : null}
    </div>
  )
}
