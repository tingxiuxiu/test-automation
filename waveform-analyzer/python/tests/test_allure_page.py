import json
from pathlib import Path

from waveform_report.allure_page import attach_waveform, render_embedded_html
from waveform_report.stats import build_waveform_document


def test_render_html_inlines_payload_and_600px(tmp_path: Path):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text(
        '<!DOCTYPE html><html><head><link rel="stylesheet" href="./assets/a.css">'
        "</head><body><div id=\"root\"></div>"
        '<script type="module" src="./assets/a.js"></script></body></html>',
        encoding="utf-8",
    )
    (dist / "assets").mkdir()
    (dist / "assets" / "a.css").write_text("body{color:red}", encoding="utf-8")
    (dist / "assets" / "a.js").write_text("console.log(window.__WAVEFORM__)", encoding="utf-8")
    doc = build_waveform_document(
        sample_count=2,
        sampling_rate=1000,
        groups={"voltage": {"Uu": [1.0, 2.0]}},
    )
    html = render_embedded_html(doc, dist)
    assert "window.__WAVEFORM__" in html
    assert '"sampleCount": 2' in html
    assert "height:600px" in html or "h-[600px]" in html
    assert "console.log" in html
    assert "body{color:red}" in html
    assert 'src="./assets/a.js"' not in html


def test_render_uses_built_viewer_when_present():
    dist = Path(__file__).resolve().parents[2] / "viewer" / "dist"
    if not (dist / "index.html").is_file():
        return
    doc = {"sampleCount": 2, "samplingRate": 1000, "voltage": {"Uu": [1.0, 2.0]}}
    html = render_embedded_html(doc, dist)
    assert "window.__WAVEFORM__" in html
    assert "<script type='module'>" in html
    assert 'src="./assets/' not in html


def test_attach_skips_when_no_doc():
    assert attach_waveform(None) is False


def test_short_channel_warning_message_has_lengths():
    doc = build_waveform_document(
        sample_count=4,
        sampling_rate=1000,
        groups={"voltage": {"Uu": [1.0, 2.0]}},
    )
    w = doc["warnings"][0]
    assert w["channel"] == "Uu"
    assert w["expected"] == 4
    assert w["actual"] == 2
    assert json.dumps(doc)
