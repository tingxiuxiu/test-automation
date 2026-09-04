import type { EChartsCoreOption } from "echarts/core"
import type { ChartModel } from "./chartModel"
import type { ColorScheme } from "../theme"

const CHROME: Record<ColorScheme, { label: string; axis: string; grid: string; empty: string }> = {
  dark: { label: "#86868b", axis: "#3a3a3c", grid: "#2c2c2e", empty: "#3a3a3c" },
  light: { label: "#86868b", axis: "#d2d2d7", grid: "#f0f0f0", empty: "#d2d2d7" },
}

export function chartOption(model: ChartModel, scheme: ColorScheme = "dark"): EChartsCoreOption {
  const chrome = CHROME[scheme]
  const traces = model.traces.length
    ? model.traces
    : [{ id: "empty", color: chrome.empty, points: [[model.xMin, null], [model.xMax, null]] as const }]

  const axisLabel = {
    color: chrome.label,
    fontSize: 10,
    fontFamily: "SF Pro Text, Inter, system-ui, sans-serif",
  }

  return {
    animation: false,
    backgroundColor: "transparent",
    tooltip: { show: false },
    legend: { show: false },
    grid: { left: 48, right: 12, top: 8, bottom: 28, containLabel: false },
    xAxis: {
      type: "value",
      min: model.xMin,
      max: model.xMax,
      axisLabel: { ...axisLabel, hideOverlap: true, formatter: (v: number) => Number(v).toPrecision(4) },
      axisLine: { lineStyle: { color: chrome.axis } },
      axisTick: { lineStyle: { color: chrome.axis } },
      splitLine: { show: true, lineStyle: { color: chrome.grid, width: 1 } },
    },
    yAxis: {
      type: "value",
      min: model.yMin ?? undefined,
      max: model.yMax ?? undefined,
      scale: true,
      axisLabel: { ...axisLabel, hideOverlap: true },
      axisLine: { lineStyle: { color: chrome.axis } },
      axisTick: { lineStyle: { color: chrome.axis } },
      splitLine: { show: true, lineStyle: { color: chrome.grid, width: 1 } },
    },
    series: traces.map((t) => ({
      type: "line" as const,
      name: t.id,
      data: t.points as Array<[number, number | null]>,
      showSymbol: false,
      connectNulls: false,
      silent: true,
      large: true,
      largeThreshold: 400,
      clip: true,
      lineStyle: { width: 1.5, color: t.color },
      itemStyle: { color: t.color },
      emphasis: { disabled: true },
    })),
  }
}
