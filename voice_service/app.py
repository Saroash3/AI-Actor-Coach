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
import wave
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import parselmouth
import torch
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from huggingface_hub import hf_hub_download
from safetensors.torch import load_file
from torch import nn
from transformers import Wav2Vec2Config, Wav2Vec2FeatureExtractor, Wav2Vec2Model

MODEL_ID = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
SAMPLE_RATE = 16_000
MAX_SECONDS = 30
MIN_SPEECH_SECONDS = 0.4

# Model labels → the 7 emotions the app uses (calm counts as neutral)
LABEL_MAP = {
    "angry": "anger",
    "calm": "neutral",
    "disgust": "disgust",
    "fearful": "fear",
    "happy": "joy",
    "neutral": "neutral",
    "sad": "sadness",
    "surprised": "surprise",
}
EMOTIONS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]


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
# This checkpoint was trained with a custom classification head (dense → tanh →
# output) on mean-pooled wav2vec2 features. The stock Wav2Vec2ForSequenceClassification
# has a different head, so loading it through `pipeline()` silently replaces the
# trained head with random weights. We rebuild the original architecture instead
# and load the weights strictly, so any mismatch fails loudly at startup.

class EmotionHead(nn.Module):
    def __init__(self, hidden_size: int, num_labels: int):
        super().__init__()
        self.dense = nn.Linear(hidden_size, hidden_size)
        self.output = nn.Linear(hidden_size, num_labels)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        return self.output(torch.tanh(self.dense(features)))


class SpeechEmotionModel(nn.Module):
    def __init__(self, config: Wav2Vec2Config):
        super().__init__()
        self.wav2vec2 = Wav2Vec2Model(config)
        self.classifier = EmotionHead(config.hidden_size, config.num_labels)

    def forward(self, input_values: torch.Tensor) -> torch.Tensor:
        hidden = self.wav2vec2(input_values).last_hidden_state  # (batch, frames, 1024)
        return self.classifier(hidden.mean(dim=1))               # mean pooling over time


model: SpeechEmotionModel | None = None
feature_extractor: Wav2Vec2FeatureExtractor | None = None
id2label: dict[int, str] = {}


def load_model():
    global model, feature_extractor, id2label
    config = Wav2Vec2Config.from_pretrained(MODEL_ID)
    model = SpeechEmotionModel(config)
    state = load_file(hf_hub_download(MODEL_ID, "model.safetensors"))
    model.load_state_dict(state, strict=True)
    model.eval()
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_ID)
    id2label = {int(k): v for k, v in config.id2label.items()}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if not SERVICE_KEY:
        print("WARNING: VOICE_SERVICE_KEY is not set; /analyze is open to anyone who can reach this service.")
    print(f"Loading {MODEL_ID} (first run downloads ~1.3 GB)…")
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

@torch.inference_mode()
def detect_emotions(audio: np.ndarray) -> dict:
    inputs = feature_extractor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt")
    probs = torch.softmax(model(inputs.input_values), dim=-1)[0].tolist()
    scores = dict.fromkeys(EMOTIONS, 0.0)
    for i, p in enumerate(probs):
        scores[LABEL_MAP[id2label[i]]] += p
    return {k: round(v, 4) for k, v in scores.items()}


# ── Prosody (Praat) ───────────────────────────────────────────────────────────

def measure_prosody(audio: np.ndarray) -> dict:
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
    return {
        "durationSec": round(len(audio) / SAMPLE_RATE, 2),
        "speechSec": round(speech_seconds, 2),
        "pitchMedianHz": round(pitch_median, 1) if pitch_median else None,
        "pitchRangeSt": round(pitch_range_st, 2) if pitch_range_st is not None else None,
        "loudnessDb": round(float(np.mean(speech_db)), 1),
        "loudnessVarDb": round(float(np.std(speech_db)), 1),
        "pauseCount": len(pauses),
        "pauseSec": round(sum(pauses), 2),
    }


# ── API ───────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": model is not None, "model": MODEL_ID}


@app.post("/analyze", dependencies=[Depends(require_key)])
def analyze(audio: UploadFile = File(...)):
    samples = read_wav(audio.file.read())
    prosody = measure_prosody(samples)
    return {"emotions": detect_emotions(samples), "prosody": prosody}
