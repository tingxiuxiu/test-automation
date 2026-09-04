# 波形分析页 — 开发计划

共同理解已确认（2026-09-03）。本文件是轮次顺序与完成标准的唯一入口。实现时先读当前轮，做完后在 `LOG.md` 追加记录，再进入下一轮。

## 仓库布局

```
waveform-analyzer/
  PLAN.md                 本计划
  LOG.md                  轮次日志
  contract/               JSON 契约（前后端共用）
  python/                 pytest 侧：MAT→JSON、统计、Allure teardown
  viewer/                 React 分析页（Vite 构建，拷入 Allure 报告）
```

## 约束（验收时对照）

- 数据链只有 MAT → pytest → 一份 `waveform.json`。
- `sampleCount` + 真实 `samplingRate`；数组按 `voltage` / `current` / `motor` 分组，可扩展未知 group。
- 短通道：JSON 保持原始短数组 + `warnings`；前端补 NaN，禁止补 0。
- 全记录统计由 pytest 写入 `stats.full`；AB 齐时浏览器算窗口统计。
- 不做功率；THD 恒 N/A；无 CSV；PNG 截当前可见分析页。
- Allure：viewer 一份；case 附 JSON；**teardown 默认展开**；iframe **600px**、无滚动、紧凑密度；全屏恢复完整线框。
- 三图共享 X；框选默认；模式互斥；Ctrl+滚轮；Y 默认全记录范围。

## 轮次

### R1 — 数据契约与统计公式

**做：** `contract/waveform.schema.json`；Python 模型校验、NaN 策略、全记录统计、写出 JSON；与 schema 对齐的 TypeScript 类型 + `normalizeWaveform`；两边公式测试。

**完成标准：** 固定夹具上 Peak/RMS/不平衡/纹波/Crest Factor 与手算字面值一致；短通道不改写入长度且产生 warning；TS normalize 末尾为 NaN 且统计跳过 NaN。本机无 Python 时用 `uv run pytest`。

### R2 — Viewer 壳与两种密度

**做：** Vite + React 19 + TS + Tailwind + 最小 shadcn 按钮。嵌入布局固定 600px、三图占位、单行工具栏、底栏一行指标、右侧改图标。全屏同一套组件切密度。`?src=` 拉 JSON。

**完成标准：** 600px 容器内无滚动条；点全屏后出现完整右侧栏与统计表骨架；窄宽下横向收缩不撑破。

### R3 — uPlot 三图 + 共享时间窗 + minmax 包络

**做：** 电压/电流/电机三图；共享 `viewX`；绘制前按像素宽度 minmax；通道显隐（默认 pair）。

**完成标准：** 194k 量级夹具（可用 8×2k 点代表，另备生成脚本）平移/缩放三图 X 轴一致；尖峰在包络中可见。

### R4 — 交互模式

**做：** 框选 / 平移 / 游标互斥；Ctrl+滚轮；撤销+复位；最小窗 ≥20 点；Y 随窗开关。

**完成标准：** 模式切换后左键只有一种行为；复位回到全记录 X。

### R5 — AB 游标与窗口统计

**做：** 可拖 A/B；CursorPanel；`stats.full` 与 AB 窗统计切换；Worker 算窗；THD 列 N/A。

**完成标准：** 无齐 AB 显示 pytest 全记录；齐 AB 后底栏数字变为窗统计且与 Python 公式一致（同一夹具）。

### R6 — Allure teardown 集成

**做：** pytest fixture：组 JSON、算 stats、`allure.attach` JSON + HTML iframe 指向报告内 viewer；构建脚本把 `viewer/dist` 拷到报告 `waveform-viewer/`。

**完成标准：** 本地 `allure open` 打开带波形的 case，teardown 里 600px 分析页默认展开；无波形 case 无 iframe。

### R7 — PNG 与收尾

**做：** 截当前可见分析页（含统计）；长度警告条；空态；16 路第 4+ group 仅全屏/抽屉。

**完成标准：** 嵌入与全屏都能出 PNG；短通道横幅文案含通道名与期望/实际长度。

## 本轮执行规则

一次只做一轮。开始时在 `LOG.md` 写「进行中」，结束时写目标、改动路径、如何验收、未完成项。未完成不得标成下一轮已开始。
