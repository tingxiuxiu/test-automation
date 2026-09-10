"""Production-scale Allure waveform: 1.94e6 samples, generated at runtime, not stored in git."""

from __future__ import annotations

from mock_drive import mock_steady_drive
from waveform_report.allure_page import render_embedded_html
from waveform_report.stats import build_waveform_document

N = 1_940_000
FS = 10_000.0


def test_large_waveform_html_does_not_inline_series(waveform_teardown):
    groups = mock_steady_drive(n=N, fs=FS)
    doc = build_waveform_document(sample_count=N, sampling_rate=FS, groups=groups)
    waveform_teardown["doc"] = doc

    assert doc["sampleCount"] == N
    assert len(doc["voltage"]["Va"]) == N
    assert doc["timeline"]["dt"] == 1.0 / FS
    assert not doc["warnings"]
    assert doc["stats"]["full"]["Va"]["rms"] is not None

    html = render_embedded_html(src="deadbeef-attachment.json")
    assert "window.__WAVEFORM_SRC__" in html
    assert '"deadbeef-attachment.json"' in html
    assert "window.__WAVEFORM__=" not in html
    assert "waveform-static-hint" in html
    assert '"Va":[' not in html
    assert len(html) < 2_000_000
