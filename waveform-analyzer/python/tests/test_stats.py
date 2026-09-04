import pytest

from waveform_report.stats import channel_stats, imbalance_percent, build_waveform_document


def test_channel_stats_skips_nan_with_literal_rms():
    st = channel_stats([3.0, 4.0, float("nan")])
    assert st["peak"] == 4.0
    assert st["min"] == 3.0
    assert st["peakPeak"] == 1.0
    assert st["average"] == 3.5
    assert st["rms"] == pytest.approx(3.5355339059327378)
    assert st["crestFactor"] == pytest.approx(1.1313708498984762)
    assert st["ripple"] == (1.0 / 3.5) * 100.0
    assert st["thd"] is None


def test_imbalance_matches_max_dev_over_mean():
    pct = imbalance_percent([220.1, 221.0, 219.4])
    assert pct == pytest.approx(0.3785, abs=1e-4)


def test_imbalance_none_without_three_phases():
    assert imbalance_percent([220.0, 221.0]) is None
    assert imbalance_percent([220.0, None, 219.0]) is None


def test_build_keeps_short_array_and_warns():
    doc = build_waveform_document(
        sample_count=4,
        sampling_rate=1000.0,
        groups={"voltage": {"Uu": [1.0, 2.0], "Vv": [1.0, 1.0, 1.0, 1.0], "Ww": [1.0, 1.0, 1.0, 1.0]}},
    )
    assert doc["voltage"]["Uu"] == [1.0, 2.0]
    assert any(w["channel"] == "Uu" and w["actual"] == 2 for w in doc["warnings"])
    assert doc["stats"]["full"]["Uu"]["peak"] == 2.0
    assert doc["stats"]["full"]["voltageImbalance"] is None


def test_crest_factor_uses_abs_extrema():
    st = channel_stats([-5.0, 3.0])
    assert st["rms"] == pytest.approx(4.123105625617661)
    assert st["crestFactor"] == pytest.approx(1.212678125181665)
