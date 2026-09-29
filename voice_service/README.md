# Voice analysis service

Analyses each recorded dialogue for the practice session:

- **Emotion in the voice**: [`ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition`](https://huggingface.co/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition), a pre-trained wav2vec2 speech emotion model (8 labels, mapped to the app's 7 emotions; calm counts as neutral).
- **Prosody**: pitch, pitch range, loudness, pauses and speaking time, measured with Praat (`praat-parselmouth`).

The Next.js app calls it through `/api/voice/analyze` (logged-in users only); scoring happens in `lib/performance-scoring.ts`.

## Setup (once)

```bash
python -m venv voice_service/.venv
voice_service/.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
voice_service/.venv/Scripts/python -m pip install -r voice_service/requirements.txt
```

(On macOS/Linux use `voice_service/.venv/bin/python`.)

## Run

```bash
npm run voice        # http://127.0.0.1:8001 (keep it running alongside `npm run dev`)
```

The first start downloads the model (~1.3 GB) into the Hugging Face cache; later starts take a few seconds.

Set `VOICE_SERVICE_URL` in `.env.local` if the service runs somewhere else (e.g. a Hugging Face Space).

## API

`POST /analyze`, multipart field `audio` (16-bit PCM WAV, mono; the browser sends 16 kHz):

```json
{
  "emotions": { "anger": 0.71, "disgust": 0.05, "fear": 0.02, "joy": 0.01, "neutral": 0.15, "sadness": 0.04, "surprise": 0.02 },
  "prosody": {
    "durationSec": 3.4, "speechSec": 2.6,
    "pitchMedianHz": 142.3, "pitchRangeSt": 6.8,
    "loudnessDb": 64.1, "loudnessVarDb": 5.2,
    "pauseCount": 1, "pauseSec": 0.4
  }
}
```

`GET /health` returns `{ "ok": true }` once the model is loaded.
