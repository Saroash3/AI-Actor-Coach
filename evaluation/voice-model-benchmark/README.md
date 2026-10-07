# Voice model benchmark: datasets

These are the test sets used to choose and check the app's voice emotion model
(emotion2vec+ large, in `voice_service/`). The results are in
[`reports/Voice_Emotion_Model_Evaluation.pdf`](../../reports/Voice_Emotion_Model_Evaluation.pdf).

| Folder | Dataset | What it is | Size |
|---|---|---|---|
| `datasets/crema-d/` | CREMA-D | 91 actors reading short sentences with an emotion, recorded in a studio | 600 clips, 100 per emotion |
| `datasets/meld/` | MELD | Real dialogue from the TV show *Friends* (official test part) | 618 clips, up to 100 per emotion |

Clips are WAV files (16 kHz) sorted into one folder per emotion: `anger`, `disgust`, `fear`, `joy`,
`neutral`, `sadness`, `surprise` (CREMA-D has no surprise).

## Running the model on them

```bash
voice_service/.venv/Scripts/python evaluation/voice-model-benchmark/run_benchmark.py
```

This sends every clip through the voice service's own code (speech-only trimming, emotion2vec+ large,
calibrated percentages) and writes `results/production_results.json`.

## Why the datasets are not on GitHub

The `datasets/` folder (about 120 MB of audio) is in `.gitignore` to keep the repository small.
On another computer, rebuild exactly the same clips with:

```bash
pip install pyarrow soundfile
python evaluation/voice-model-benchmark/prepare_datasets.py
```

## Sources and licences

- **CREMA-D**: H. Cao et al., *CREMA-D: Crowd-sourced Emotional Multimodal Actors Dataset*, IEEE Transactions
  on Affective Computing, 2014. Open Database License. Copy used: Hugging Face `mteb/crema-d`.
- **MELD**: S. Poria et al., *MELD: A Multimodal Multi-Party Dataset for Emotion Recognition in Conversations*,
  ACL 2019. GPL-3.0. Copy used: Hugging Face `AudioLLMs/meld_emotion_test` (official test split).
