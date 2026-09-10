import json
from pathlib import Path

from waveform_report.allure_page import attach_waveform, render_embedded_html
from waveform_report.stats import build_waveform_document


def _dist_with_assets(tmp_path: Path) -> Path:
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
    (dist / "assets" / "a.js").write_text("console.log(window.__WAVEFORM_SRC__)", encoding="utf-8")
    return dist


def test_render_html_fetches_src_and_stays_600px(tmp_path: Path):
    dist = _dist_with_assets(tmp_path)
    doc = build_waveform_document(
        sample_count=2,
        sampling_rate=1000,
        groups={"voltage": {"Va": [1.0, 2.0]}},
    )
    html = render_embedded_html(dist, src="abc-attachment.json")
    assert "window.__WAVEFORM_SRC__" in html
    assert '"abc-attachment.json"' in html
    assert "window.__WAVEFORM__=" not in html
    assert "waveform-static-hint" in html
    assert "Allure 3" in html
    assert "[1.0, 2.0]" not in html and "[1.0,2.0]" not in html
    assert json.dumps(doc["voltage"]["Va"]) not in html
    assert "height:600px" in html or "h-[600px]" in html
    assert "console.log" in html
    assert "body{color:red}" in html
    assert 'src="./assets/a.js"' not in html


def test_render_uses_built_viewer_when_present():
    dist = Path(__file__).resolve().parents[2] / "viewer" / "dist"
    if not (dist / "index.html").is_file():
        return
    html = render_embedded_html(dist, src="sidecars.json")
    assert "window.__WAVEFORM_SRC__" in html
    assert "window.__WAVEFORM__=" not in html
    assert "waveform-static-hint" in html
    assert "<script type='module'>" in html
    assert 'src="./assets/' not in html


def test_attach_skips_when_no_doc():
    assert attach_waveform(None) is False


class _StubReporter:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def attach_data(self, uuid, body, name=None, attachment_type=None, extension=None):
        self.calls.append(
            {
                "uuid": uuid,
                "body": body,
                "name": name,
                "attachment_type": attachment_type,
                "extension": extension,
            }
        )


def test_attach_registers_plaintext_json_sidecar(tmp_path: Path, monkeypatch):
    dist = _dist_with_assets(tmp_path)
    stub = _StubReporter()
    monkeypatch.setattr("waveform_report.allure_page._allure_reporter", lambda: stub)
    monkeypatch.setattr("waveform_report.allure_page.VIEWER_DIST", dist)
    doc = build_waveform_document(
        sample_count=2,
        sampling_rate=1000,
        groups={"voltage": {"Va": [1.0, 2.0]}},
    )
    assert attach_waveform(doc, dist) is True
    assert len(stub.calls) == 2
    json_call, html_call = stub.calls
    assert json_call["name"] == "waveform.json"
    assert json_call["attachment_type"] == "text/plain"
    assert json_call["extension"] == "json"
    assert '"Va":[1' in json_call["body"]
    assert html_call["name"] == "waveform-analysis"
    src = f"{json_call['uuid']}-attachment.json"
    assert src in html_call["body"]
    assert "waveform-static-hint" in html_call["body"]
    assert "window.__WAVEFORM__=" not in html_call["body"]
    assert '"Va":[1' not in html_call["body"]


def test_short_channel_warning_message_has_lengths():
    doc = build_waveform_document(
        sample_count=4,
        sampling_rate=1000,
        groups={"voltage": {"Va": [1.0, 2.0]}},
    )
    w = doc["warnings"][0]
    assert w["channel"] == "Va"
    assert w["expected"] == 4
    assert w["actual"] == 2
    assert json.dumps(doc)
