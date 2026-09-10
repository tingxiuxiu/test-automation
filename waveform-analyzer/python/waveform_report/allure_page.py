from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

VIEWER_DIST = Path(__file__).resolve().parents[2] / "viewer" / "dist"


def _dist_file(dist: Path, rel: str) -> Path:
    return dist / rel.lstrip("./").replace("\\", "/")


def _inject_src(src: str) -> str:
    hint = (
        '<div id="waveform-static-hint">'
        "<p>Allure 3 内嵌预览禁用脚本，因此这里看不到分析页。</p>"
        "<p>请点用例链接「打开波形分析」，或在附件菜单选择「在新标签打开」。"
        "内嵌 600px 交互页请运行 <code>allure allure2 allure-results</code>。</p>"
        "</div>"
    )
    return f"<script>window.__WAVEFORM_SRC__={json.dumps(src)};</script>{hint}"


_HEAD_STYLE = (
    "<head><style>"
    "html,body,#root{height:600px;overflow:hidden;margin:0;position:relative}"
    "#waveform-static-hint{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;"
    "align-items:center;justify-content:center;gap:8px;padding:24px;background:#000;color:#d2d2d7;"
    "font:14px/1.5 system-ui,sans-serif;text-align:center;box-sizing:border-box}"
    "#waveform-static-hint code{color:#2997ff}"
    "body:has(#root:not(:empty)) #waveform-static-hint{display:none}"
    "</style>"
)



def render_embedded_html(dist: Path | None = None, *, src: str) -> str:
    dist = dist or VIEWER_DIST
    inject = _inject_src(src)
    index_path = dist / "index.html"
    if not index_path.is_file():
        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'>"
            f"{_HEAD_STYLE.removeprefix('<head>')}</head>"
            f"<body>{inject}<div id='root'></div></body></html>"
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
    html = html.replace("<head>", _HEAD_STYLE, 1)
    return html


def _allure_reporter() -> Any | None:
    try:
        from allure_commons._core import plugin_manager
    except ImportError:
        return None
    for plugin in plugin_manager.get_plugins():
        logger = getattr(plugin, "allure_logger", None)
        if logger is not None and hasattr(logger, "attach_data"):
            return logger
    return None


def attach_waveform(doc: dict[str, Any] | None, dist: Path | None = None) -> bool:
    if not doc:
        return False
    try:
        from allure_commons.types import AttachmentType
        from allure_commons.utils import uuid4
    except ImportError:
        return False

    reporter = _allure_reporter()
    json_uuid = uuid4()
    src_name = f"{json_uuid}-attachment.json"
    body = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    html = render_embedded_html(dist, src=src_name)
    if reporter is None:
        return False
    reporter.attach_data(
        json_uuid,
        body,
        name="waveform.json",
        attachment_type="text/plain",
        extension="json",
    )
    html_uuid = uuid4()
    html_name = f"{html_uuid}-attachment.html"
    reporter.attach_data(
        html_uuid,
        html,
        name="waveform-analysis",
        attachment_type=AttachmentType.HTML,
    )
    try:
        import allure

        allure.dynamic.link(f"data/attachments/{html_name}?attachment", name="打开波形分析")
    except Exception:
        pass
    return True
