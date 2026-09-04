from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

VIEWER_DIST = Path(__file__).resolve().parents[2] / "viewer" / "dist"


def _dist_file(dist: Path, rel: str) -> Path:
    return dist / rel.lstrip("./").replace("\\", "/")


def render_embedded_html(doc: dict[str, Any], dist: Path | None = None) -> str:
    dist = dist or VIEWER_DIST
    payload = json.dumps(doc, ensure_ascii=False)
    inject = f"<script>window.__WAVEFORM__={payload};</script>"
    index_path = dist / "index.html"
    if not index_path.is_file():
        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'>"
            "<style>html,body,#root{margin:0;height:600px;overflow:hidden}</style></head>"
            f"<body>{inject}<div id='root'>viewer dist missing</div></body></html>"
        )
    html = index_path.read_text(encoding="utf-8")
    html = html.replace('<div id="root"></div>', inject + '<div id="root"></div>', 1)
    css_m = re.search(r'<link[^>]+href="([^"]+\.css)"[^>]*>', html)
    js_m = re.search(r'<script[^>]+src="([^"]+\.js)"[^>]*></script>', html)
    if css_m:
        css_file = _dist_file(dist, css_m.group(1))
        if css_file.is_file():
            css = css_file.read_text(encoding="utf-8")
            html = html.replace(css_m.group(0), f"<style>{css}</style>", 1)
    if js_m:
        js_file = _dist_file(dist, js_m.group(1))
        if js_file.is_file():
            js = js_file.read_text(encoding="utf-8")
            html = html.replace(js_m.group(0), f"<script type='module'>{js}</script>", 1)
    html = html.replace("<head>", "<head><style>html,body,#root{height:600px;overflow:hidden;margin:0}</style>", 1)
    return html


def attach_waveform(doc: dict[str, Any] | None, dist: Path | None = None) -> bool:
    if not doc:
        return False
    try:
        import allure
        from allure_commons.types import AttachmentType
    except ImportError:
        return False
    html = render_embedded_html(doc, dist)
    allure.attach(html, name="waveform-analysis", attachment_type=AttachmentType.HTML)
    allure.attach(
        json.dumps(doc, ensure_ascii=False),
        name="waveform.json",
        attachment_type=AttachmentType.JSON,
    )
    return True
