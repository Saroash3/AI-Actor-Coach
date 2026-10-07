"""
Runs every clip in datasets/ through the voice service's own emotion pipeline (voice_service/app.py:
speech-only trimming + emotion2vec+ large + calibrated percentages) and saves the results.

    voice_service/.venv/Scripts/python evaluation/voice-model-benchmark/run_benchmark.py

Writes results/production_results.json (one row per clip: dataset, true emotion, predicted percentages).
"""
import glob, json, os, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "voice_service"))

import app as voice  # the production code
from fastapi import HTTPException
from funasr import AutoModel

voice.model = AutoModel(model=voice.MODEL_ID, hub="hf", disable_update=True)  # emotion model only, no Whisper needed

rows, skipped, t0 = [], 0, time.time()
files = sorted(glob.glob(str(HERE / "datasets" / "*" / "*" / "*.wav")))
for i, path in enumerate(files):
    dataset, emotion = Path(path).parts[-3], Path(path).parts[-2]
    samples = voice.read_wav(Path(path).read_bytes())
    try:
        _, (start, end) = voice.measure_prosody(samples)
    except HTTPException:  # too little speech: the app asks for a retake
        skipped += 1
        continue
    lo = max(0, int((start - voice.SPEECH_MARGIN_SECONDS) * voice.SAMPLE_RATE))
    hi = min(len(samples), int((end + voice.SPEECH_MARGIN_SECONDS) * voice.SAMPLE_RATE))
    rows.append({"dataset": dataset, "emotion": emotion, "file": Path(path).name, "predicted": voice.detect_emotions(samples[lo:hi])})
    if i % 200 == 0:
        print(f"{i}/{len(files)}", flush=True)

out = HERE / "results" / "production_results.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({"model": voice.MODEL_ID, "calibration_T": voice.CALIBRATION_T, "skipped_too_short": skipped,
                           "seconds_per_clip": (time.time() - t0) / max(1, len(files)), "rows": rows}, indent=0))
print(f"done: {len(rows)} clips scored, {skipped} too short, saved {out}")
