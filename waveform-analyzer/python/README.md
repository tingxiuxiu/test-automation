# waveform-report

Pytest teardown 把 `waveform.json` 做成 Allure HTML（600px 分析页）。先构建 viewer：

```
cd ../viewer && npm run build
cd ../python && uv sync --extra dev --extra allure
uv run pytest
```

## Mock 业务用例（Allure 报告含波形分析）

一条完整台架用例：`examples/test_inverter_drive_cycle.py`。会采集 1 s / 10 kHz 的三相电压、电流、转速与负载，判定 RMS / 不平衡 / 转速，并在 teardown 挂上可交互的波形分析页。

一条命令（构建 viewer → pytest → `allure-results`；已安装 Allure CLI 时同时生成 `allure-report`）：

```
cd waveform-analyzer/python
uv sync --extra dev --extra allure
uv run python scripts/run_allure_demo.py
allure open allure-results
```

或分步：

```
cd waveform-analyzer/viewer && npm run build
cd ../python
uv run pytest examples/test_inverter_drive_cycle.py --alluredir=allure-results
allure open allure-results
```

Allure 3 可直接 `allure open allure-results`（会现场生成并打开）。若已生成 `allure-report`，也可以 `allure open allure-report`。

打开报告后进入用例 **稳态 PWM 驱动**，在 Teardown / 附件中打开 `waveform-analysis`，即可框选、平移、打 A/B 游标。

无 `doc` 则不挂波形附件。需 Allure 时：`uv sync --extra dev --extra allure` 并加 `--alluredir`。
