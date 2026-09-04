"""Mock 逆变器台架业务用例：pytest 通过后 Allure 报告内嵌波形分析页。"""

from __future__ import annotations

import pytest

allure = pytest.importorskip("allure")

from mock_drive import mock_steady_drive
from waveform_report.stats import build_waveform_document

N = 10_000
FS = 10_000.0
DURATION_S = (N - 1) / FS


@allure.epic("电机台架试验")
@allure.feature("变频器稳态驱动")
@allure.story("50 Hz PWM 三相输出")
@allure.severity(allure.severity_level.CRITICAL)
@allure.tag("mock", "waveform", "inverter")
@allure.title("稳态 PWM 驱动：电压 RMS、不平衡度与转速在规格内")
@allure.description(
    "模拟 1 s / 10 kHz 台架采集：三相电压、三相电流、转速与负载。"
    "teardown 将 waveform.json 内嵌为 600px 波形分析页，可在报告中框选、平移、打 A/B 游标。"
)
def test_inverter_steady_drive_meets_spec(waveform_teardown):
    allure.dynamic.parameter("sampleCount", N)
    allure.dynamic.parameter("samplingRateHz", FS)

    with allure.step("台架按 50 Hz 指令进入稳态"):
        groups = mock_steady_drive(n=N, fs=FS)

    with allure.step(f"采集 {DURATION_S:.3f} s @ {FS:.0f} Hz（电压 / 电流 / 电机）"):
        doc = build_waveform_document(sample_count=N, sampling_rate=FS, groups=groups)
        waveform_teardown["doc"] = doc
        assert not doc["warnings"], doc["warnings"]

    full = doc["stats"]["full"]
    uu = full["Uu"]
    speed = full["speed"]
    u_imb = full["voltageImbalance"]

    with allure.step("判定规格：Uu RMS 210–230 V，电压不平衡 < 2%，转速 2800–3000 rpm"):
        summary = (
            f"Uu RMS = {uu['rms']:.2f} V  (规格 210–230)\n"
            f"电压不平衡 = {u_imb:.3f} %  (规格 < 2)\n"
            f"转速均值 = {speed['average']:.1f} rpm  (规格 2800–3000)\n"
            f"Uu Peak = {uu['peak']:.1f} V\n"
            f"采样 = {N} 点 · {FS:.0f} Hz\n"
        )
        allure.attach(summary, name="判定摘要", attachment_type=allure.attachment_type.TEXT)
        assert uu["rms"] is not None and 210.0 <= uu["rms"] <= 230.0
        assert u_imb is not None and u_imb < 2.0
        assert speed["average"] is not None and 2800.0 <= speed["average"] <= 3000.0
