"""Generate a 150k-point-per-channel waveform.json for the viewer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from waveform_report.stats import build_waveform_document

DEFAULT_N = 150_000
DEFAULT_FS = 10_000.0


def synthesize(n: int, fs: float, seed: int = 7) -> dict[str, dict[str, list[float]]]:
    rng = np.random.default_rng(seed)
    t = np.arange(n, dtype=np.float64) / fs
    w = 2 * np.pi * 50.0
    carrier = 2 * np.pi * 2000.0

    u_peak = 311.0
    i_peak = 15.0
    pwm = 8.0 * np.sin(carrier * t)
    noise_v = rng.normal(0, 1.2, n)
    noise_i = rng.normal(0, 0.08, n)

    uu = u_peak * np.sin(w * t) + pwm + noise_v
    vv = u_peak * np.sin(w * t - 2 * np.pi / 3) + pwm * 0.95 + noise_v * 0.6
    ww = u_peak * np.sin(w * t + 2 * np.pi / 3) + pwm * 0.9 + noise_v * 0.5

    iu = i_peak * np.sin(w * t - 0.35) + noise_i
    iv = i_peak * np.sin(w * t - 2 * np.pi / 3 - 0.35) + noise_i * 0.9
    iw = i_peak * np.sin(w * t + 2 * np.pi / 3 - 0.35) + noise_i * 0.85

    # Spikes so minmax envelope is visibly doing work
    uu[n // 5] = 420.0
    iu[n // 3] = 28.0
    vv[n // 2] = -390.0

    speed = 2900 + 40 * np.sin(2 * np.pi * 0.4 * t) + rng.normal(0, 3, n)
    load = 75 + 6 * np.sin(2 * np.pi * 0.25 * t) + rng.normal(0, 0.4, n)

    def pack(arr: np.ndarray) -> list[float]:
        return np.round(arr, 3).tolist()

    return {
        "voltage": {"Uu": pack(uu), "Vv": pack(vv), "Ww": pack(ww)},
        "current": {"Iu": pack(iu), "Iv": pack(iv), "Iw": pack(iw)},
        "motor": {"speed": pack(speed), "load": pack(load)},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=DEFAULT_N)
    parser.add_argument("--fs", type=float, default=DEFAULT_FS)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "viewer" / "public" / "sample.json",
    )
    args = parser.parse_args()
    groups = synthesize(args.n, args.fs)
    doc = build_waveform_document(sample_count=args.n, sampling_rate=args.fs, groups=groups)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    mb = args.out.stat().st_size / 1_048_576
    print(f"wrote {args.out}  n={args.n}  fs={args.fs}  {mb:.1f} MB")


if __name__ == "__main__":
    main()
