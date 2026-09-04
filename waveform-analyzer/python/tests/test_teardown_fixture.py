from waveform_report.stats import build_waveform_document


def test_teardown_slot_accepts_doc(waveform_teardown):
    waveform_teardown["doc"] = build_waveform_document(
        sample_count=4,
        sampling_rate=1000.0,
        groups={"voltage": {"Uu": [1.0, 2.0, 3.0, 4.0]}},
    )
    assert waveform_teardown["doc"]["sampleCount"] == 4
