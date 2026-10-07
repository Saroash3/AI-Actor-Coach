"""
Voice analysis service for ActorPro AI.

POST /analyze  (multipart field "audio": 16-bit PCM WAV, mono)
  → emotions heard in the voice (speech emotion recognition)
  → prosody: pitch, loudness, speaking time and pauses (Praat via parselmouth)

Run:  .venv/Scripts/python -m uvicorn app:app --port 8001
"""

import hmac
import io
import os
import threading
import wave
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import parselmouth
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from funasr import AutoModel

# emotion2vec+ large (~300M params, FunASR model licence: free use with attribution).
# Chosen over the previous ehcalabres/wav2vec2 model after a benchmark on unseen speakers:
# balanced accuracy 30% vs 22% on MELD (TV dialogue) and 85% vs 40% on CREMA-D (acted), and it
# almost never mistakes acted emotion for neutral (2% vs 21%). ~0.7 s per line on a laptop CPU.
MODEL_ID = "emotion2vec/emotion2vec_plus_large"
SAMPLE_RATE = 16_000
MAX_SECONDS = 30
MIN_SPEECH_SECONDS = 0.4

# Model labels ("生气/angry", …: the English part after "/") → the 7 emotions the app uses.
# "other" and "<unk>" are dropped and the rest re-normalised.
LABEL_MAP = {
    "angry": "anger",
    "disgusted": "disgust",
    "fearful": "fear",
    "happy": "joy",
    "neutral": "neutral",
    "sad": "sadness",
    "surprised": "surprise",
}
EMOTIONS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]

# The model is over-confident (median 98% on its top guess while right ~60% of the time), so a slightly
# sad-sounding take showed as "100% sadness". Temperature scaling (p^(1/T), renormalised) with T fitted on
# held-out benchmark clips (CREMA-D + MELD) makes the shown percentages match how often it is right:
# average stated confidence 87% -> 61% vs 60% actual accuracy; calibration error 26% -> 6%.
CALIBRATION_T = 3.25

# Recordings end with the 2.5–7 s of quiet the app waits for before auto-stopping. That tail hurts the
# model (in tests, angry clips padded with room noise dropped from 9/12 to 3/12 correct), so emotion is
# judged on the speech only, plus a short margin.
SPEECH_MARGIN_SECONDS = 0.15


# ── Access key ────────────────────────────────────────────────────────────────
# When the service is reachable from the internet (ngrok tunnel, Lambda), only the
# website may call /analyze: it sends VOICE_SERVICE_KEY in the X-Voice-Key header.
# Read from the environment, or from the project's .env.local on the laptop.

def read_service_key() -> str:
    key = os.environ.get("VOICE_SERVICE_KEY", "")
    env_file = Path(__file__).resolve().parent.parent / ".env.local"
    if not key and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "VOICE_SERVICE_KEY":
                key = value.strip().strip("\"'")
    return key


SERVICE_KEY = read_service_key()


def require_key(x_voice_key: str = Header(default="")):
    if SERVICE_KEY and not hmac.compare_digest(x_voice_key, SERVICE_KEY):
        raise HTTPException(401, "Invalid or missing X-Voice-Key")


# ── Model ─────────────────────────────────────────────────────────────────────

model: AutoModel | None = None
model_lock = threading.Lock()  # /analyze runs in a thread pool; one inference at a time


def load_model():
    global model
    model = AutoModel(model=MODEL_ID, hub="hf", disable_update=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not SERVICE_KEY:
        print("WARNING: VOICE_SERVICE_KEY is not set; /analyze is open to anyone who can reach this service.")
    print(f"Loading {MODEL_ID} (first run downloads ~1.2 GB)…")
    load_model()
    detect_emotions(np.zeros(SAMPLE_RATE, dtype=np.float32))  # warm-up
    print("Voice model ready.")
    yield


app = FastAPI(title="ActorPro Voice Analysis", lifespan=lifespan)


# ── Audio loading ─────────────────────────────────────────────────────────────

def read_wav(data: bytes) -> np.ndarray:
    try:
        with wave.open(io.BytesIO(data)) as wav:
            if wav.getsampwidth() != 2:
                raise ValueError("expected 16-bit PCM")
            rate, channels = wav.getframerate(), wav.getnchannels()
            samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16)
    except (wave.Error, EOFError, ValueError) as err:
        raise HTTPException(400, f"Invalid WAV audio: {err}")

    audio = samples.astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    if rate != SAMPLE_RATE:
        n = int(len(audio) * SAMPLE_RATE / rate)
        audio = np.interp(np.linspace(0, len(audio), n, endpoint=False), np.arange(len(audio)), audio)
    return audio[: SAMPLE_RATE * MAX_SECONDS].astype(np.float32)


# ── Emotion (speech emotion recognition) ──────────────────────────────────────

def detect_emotions(audio: np.ndarray) -> dict:
    with model_lock:
        result = model.generate(audio, granularity="utterance", extract_embedding=False, disable_pbar=True)[0]
    scores = dict.fromkeys(EMOTIONS, 0.0)
    for label, p in zip(result["labels"], result["scores"]):
        emotion = LABEL_MAP.get(label.split("/")[-1])
        if emotion:
            scores[emotion] += float(p)
    if sum(scores.values()) == 0:  # everything went to "other"/"<unk>"
        return {k: 1.0 if k == "neutral" else 0.0 for k in EMOTIONS}
    calibrated = {k: max(v, 1e-6) ** (1 / CALIBRATION_T) for k, v in scores.items()}
    total = sum(calibrated.values())
    return {k: round(v / total, 4) for k, v in calibrated.items()}


# ── Prosody (Praat) ───────────────────────────────────────────────────────────

def measure_prosody(audio: np.ndarray) -> tuple[dict, tuple[float, float]]:
    """Returns the prosody and the (start, end) of the speech in seconds."""
    sound = parselmouth.Sound(audio.astype(np.float64), sampling_frequency=SAMPLE_RATE)

    # Loudness per 10 ms frame, in dB
    intensity = sound.to_intensity(minimum_pitch=75, time_step=0.01)
    db = intensity.values[0]
    times = intensity.xs()

    # Speech = frames well above the noise floor and within 25 dB of the loudest part
    threshold = max(np.percentile(db, 95) - 25, np.percentile(db, 10) + 6)
    is_speech = db > threshold
    if not is_speech.any():
        raise HTTPException(422, "No speech detected")
    first, last = np.argmax(is_speech), len(is_speech) - 1 - np.argmax(is_speech[::-1])

    # Pauses: silent stretches of 0.25 s or more between the first and last word
    pauses, run = [], 0
    for speaking in is_speech[first : last + 1]:
        if speaking:
            if run * 0.01 >= 0.25:
                pauses.append(run * 0.01)
            run = 0
        else:
            run += 1
    active_span = float(times[last] - times[first])
    speech_seconds = active_span - sum(pauses)
    if speech_seconds < MIN_SPEECH_SECONDS:
        raise HTTPException(422, "Too little speech to analyse")

    # Pitch: median in Hz, and range (10th–90th percentile) in semitones,
    # which makes range comparable between deep and high voices
    pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=75, pitch_ceiling=600)
    f0 = pitch.selected_array["frequency"]
    voiced = f0[f0 > 0]
    if len(voiced) >= 5:
        p10, p90 = np.percentile(voiced, [10, 90])
        pitch_median = float(np.median(voiced))
        pitch_range_st = float(12 * np.log2(p90 / p10))
    else:
        pitch_median, pitch_range_st = None, None

    speech_db = db[first : last + 1][is_speech[first : last + 1]]
    prosody = {
        "durationSec": round(len(audio) / SAMPLE_RATE, 2),
        "speechSec": round(speech_seconds, 2),
        "pitchMedianHz": round(pitch_median, 1) if pitch_median else None,
        "pitchRangeSt": round(pitch_range_st, 2) if pitch_range_st is not None else None,
        "loudnessDb": round(float(np.mean(speech_db)), 1),
        "loudnessVarDb": round(float(np.std(speech_db)), 1),
        "pauseCount": len(pauses),
        "pauseSec": round(sum(pauses), 2),
    }
    return prosody, (float(times[first]), float(times[last]))


# ── API ───────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": model is not None, "model": MODEL_ID}


@app.post("/analyze", dependencies=[Depends(require_key)])
def analyze(audio: UploadFile = File(...)):
    samples = read_wav(audio.file.read())
    prosody, (start, end) = measure_prosody(samples)
    lo = max(0, int((start - SPEECH_MARGIN_SECONDS) * SAMPLE_RATE))
    hi = min(len(samples), int((end + SPEECH_MARGIN_SECONDS) * SAMPLE_RATE))
    return {"emotions": detect_emotions(samples[lo:hi]), "prosody": prosody}
