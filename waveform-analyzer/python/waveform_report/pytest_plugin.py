from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pytest

from waveform_report.allure_page import attach_waveform


@pytest.fixture
def waveform_teardown() -> Iterator[dict[str, Any]]:
    slot: dict[str, Any] = {}
    yield slot
    attach_waveform(slot.get("doc"))
