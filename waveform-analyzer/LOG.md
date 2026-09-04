# 波形分析页 — 轮次日志

## Round 1 — 2026-09-03 — 完成

**目标：** 数据契约 + 统计公式。  
**验收：** `python` 下 `uv run pytest -q`；`viewer` 下 `npm test`。

---

## Round 2 — 2026-09-03 — 完成

**目标：** 600px / 全屏密度壳、`?src=`。  
**验收：** `npm run build`；根节点 600px `overflow-hidden`。

---

## Round 3 — 2026-09-03 — 完成

**目标：** uPlot 三图、共享 `viewX`、minmax 包络、pair 显隐。  
**改动：** `minmax.ts`、`pairs.ts`、`UPlotGroup.tsx`、`store.ts`。  
**测试：** `viewRange.test.ts` 含 2000 点尖峰包络、pair 同时隐藏 Uu/Iu。  
**验收：** `npx vitest run` 中 minmax + pairs 用例。

---

## Round 4 — 2026-09-03 — 完成

**目标：** 框选/平移/游标互斥、Ctrl+滚轮、撤销+复位、最小 20 点、Y 随窗。  
**改动：** `viewRange.ts`、`yRange.ts`、图表指针事件、工具栏。  
**测试：** `clampRange` ≥20；`store.test.ts` 撤销/复位；`yRange.test.ts` 全记录 vs 窗口。

---

## Round 5 — 2026-09-03 — 完成

**目标：** AB 游标、全记录 vs 窗统计、THD=N/A。  
**改动：** `windowStats.ts`；底栏/全屏表切换；游标竖线。  
**测试：** AB 切片 RMS 与 `channelStats([3,4])` 手算 3.5355… 一致。  
**说明：** 194k 级窗统计在主线程完成，未再拆 Worker（公式与 pytest 相同，可测）。

---

## Round 6 — 2026-09-03 — 完成

**目标：** teardown 挂分析页。  
**改动：** `allure_page.py` 把 `viewer/dist` CSS/JS 内联进 HTML + `window.__WAVEFORM__`；`waveform_teardown` fixture；无 doc 不挂。  
**测试：** 10 passed（内联 payload、600px、短通道 warning 含 expected/actual、真实 dist 无外链 assets）。  
**用法：** 先 `npm run build`，再 `uv sync --extra allure` 跑带 Allure 的用例。

---

## Round 7 — 2026-09-03 — 完成

**目标：** PNG、警告条、空/加载态、嵌入只画 voltage/current/motor。  
**改动：** `capture.ts` + 工具栏 PNG；警告用 `channel/actual/expected`；第 4+ group 仅全屏堆叠。  
**测试：** 警告文案断言在 `test_short_channel_warning_message_has_lengths`；viewer 13 tests。  
**PNG：** 浏览器里点 PNG 才出图（html-to-image，无无头截图像素断言）。

---

## 总验收

```
cd waveform-analyzer/python && uv run pytest -q
cd waveform-analyzer/viewer && npm test && npm run build
```

当前：Python **10 passed**；Vitest **13 passed**；`vite build` 单 chunk。

---

## Visual Round — 暗色仪器主题 + Apple 设计规范

**目标**：参考 `tmp-page` 的暗色仪器面板美学和 Apple DESIGN.md 的交互/排版纪律，重写视觉层。

**设计决策**：
- 暗色底 `#0f1117` + 卡片 `#141721` + 边框 `#1e293b` — 取自 `tmp-page`
- 通道色板切换为高辨识度的柔和霓虹色（红/绿/蓝/橙/紫/粉/黄/青）
- Apple pill 分段控件改为暗色圆角矩形 + accent glow
- 游标线 A = 琥珀色带辉光，B = 蓝色带辉光
- 统计表使用等宽字体 + tabular-nums
- 品牌锁定区增加绿色脉冲指示点
- 响应式断点保留 760px，暗色下尺寸更紧凑

**改动文件**：
| 文件 | 变更 |
|---|---|
| `viewer/src/index.css` | 全部重写：暗色 CSS 变量、所有语义类暗色化 |
| `viewer/src/charts/UPlotGroup.tsx` | 通道色板 8 色、网格/轴/光标暗色化 |
| `viewer/src/layout/WaveformPage.tsx` | 通道色板同步、品牌指示点 |

**验收**：Vitest 13 passed · Python 10 passed · `vite build` 单 chunk (281 kB gzipped 97 kB)

---

## Rebuild — PLAN 行为 + Apple DESIGN.md（2026-09-04）

**原因：** 暗色工业主题混入交互层，框选/平移/游标与图表铺满被一起改坏。本轮按 PLAN 行为 + Apple 浅色规范重写视觉与图表交互，不改数据契约与统计公式。

**视觉：** Parchment `#f5f5f7`、白卡片 18px hairline、交互色仅 Action Blue `#0066cc`；毛玻璃顶栏、pill 分段、`scale(0.95)` 按压。全屏统计为电压/电流/电机三卡片；嵌入态仍为 600px 单行底栏。

**交互：** overlay 与 uPlot 隔离；框选画选区；平移只改增量坐标；游标 A/B 点击；`plot-host` 绝对铺满 `chart-region`。

**结构：** `theme.ts`；`AppBar` / `ChannelPanel` / `CursorPanel` / `StatsFooter`；`UPlotGroup` 重写。

**验收：** Vitest 13 · Python 10 · `vite build` 单 chunk。浏览器：框选蓝区可见；A/B 竖线与抽屉读数；AB 齐后底栏切到窗统计。

---

## Chart engine — uPlot → ECharts（2026-09-04）

**做：** 渲染层换成 ECharts（`core` + Line + Grid + Canvas）；minmax 包络、共享 view、框选/平移/游标 overlay 不变。

**改动：** `chartModel.ts`、`echartsOption.ts`、`ChartGroup.tsx`；删除 `UPlotGroup.tsx`；依赖 `echarts` 替换 `uplot`。

**验收：** Vitest 16 · Python 10 · 三图 `_echarts_instance_` 存在。产物约 699 kB（gzip 235 kB），Allure 内联会变大。
