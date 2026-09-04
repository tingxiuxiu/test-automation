"""Build the viewer, run the mock Allure case, write allure-results (and allure-report if CLI exists)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

PYTHON_ROOT = Path(__file__).resolve().parents[1]
VIEWER_ROOT = PYTHON_ROOT.parent / "viewer"
RESULTS = PYTHON_ROOT / "allure-results"
REPORT = PYTHON_ROOT / "allure-report"
CASE = PYTHON_ROOT / "examples" / "test_inverter_drive_cycle.py"


def run(cmd: list[str], cwd: Path) -> None:
    print("+", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd)


def find_allure() -> str | None:
    return shutil.which("allure") or shutil.which("allure.cmd") or shutil.which("allure.bat")


def ensure_viewer() -> None:
    index = VIEWER_ROOT / "dist" / "index.html"
    if index.is_file():
        print(f"viewer dist ok: {index}")
        return
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        raise SystemExit("viewer/dist missing and npm not found. Build the viewer first.")
    run([npm, "run", "build"], VIEWER_ROOT)
    if not index.is_file():
        raise SystemExit(f"viewer build finished but {index} is missing")


def main() -> None:
    ensure_viewer()
    if RESULTS.exists():
        shutil.rmtree(RESULTS)
    RESULTS.mkdir(parents=True)
    (RESULTS / "environment.properties").write_text(
        "Stand=mock inverter bench\nSamplingRate=10000 Hz\nDuration=1 s\n",
        encoding="utf-8",
    )
    run(
        [
            sys.executable,
            "-m",
            "pytest",
            str(CASE),
            f"--alluredir={RESULTS}",
            "-q",
        ],
        PYTHON_ROOT,
    )
    allure = find_allure()
    if allure:
        if REPORT.exists():
            shutil.rmtree(REPORT)
        run([allure, "generate", str(RESULTS), "--output", str(REPORT)], PYTHON_ROOT)
        print(f"\nResults: {RESULTS}")
        print(f"Report:  {REPORT}")
        print(f"Open:    allure open {RESULTS}")
        print(f"   or:   allure open {REPORT}")
    else:
        print(f"\nResults written to {RESULTS}")
        print("Allure CLI not found. Install it, then:")
        print(f"  allure open {RESULTS}")


if __name__ == "__main__":
    main()
