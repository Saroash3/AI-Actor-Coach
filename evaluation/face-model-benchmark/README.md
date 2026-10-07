# Face model benchmark: datasets

These are the test sets we used to choose the app's facial emotion model
(HSEmotion EfficientNet-B2). The results are in
[`reports/Facial_Emotion_Model_Evaluation.pdf`](../../reports/Facial_Emotion_Model_Evaluation.pdf).

| Folder | Dataset | What it is | Size |
|---|---|---|---|
| `datasets/raf-db/` | RAF-DB | Real-life photos with natural expressions (main test) | 1,800 faces, 300 per emotion |
| `datasets/ckplus/` | CK+ | Clear, posed expressions recorded in a lab | 927 faces |
| `datasets/fer2013/` | FER-2013 | Small black-and-white face photos (random sample of the test split) | 1,000 faces |
| `datasets/ravdess/` | RAVDESS | Video of professional actors speaking lines with an emotion | 240 clips (actors 01, 04, 05, 06) |

Images are sorted into one folder per emotion (`anger`, `disgust`, `fear`, `joy`, `neutral`, `sadness`, `surprise`).
For RAVDESS the emotion is the third number in the file name: 01 neutral, 02 calm, 03 joy, 04 sadness, 05 anger,
06 fear, 07 disgust, 08 surprise (calm was counted as neutral).

## Why the datasets are not on GitHub

The `datasets/` folder is in `.gitignore` on purpose:

- **RAF-DB** and **CK+** are licensed for research only and their owners do not allow re-sharing them. This repo is public.
- **RAVDESS** is 1.1 GB, too big for GitHub.

## Getting the datasets on another computer

The script downloads the same files from their public sources and picks exactly the same faces we tested on
(about 2.7 GB of downloads):

```bash
pip install pyarrow pillow numpy
python evaluation/face-model-benchmark/prepare_datasets.py
```

## Sources and licences

- **RAF-DB**: S. Li, W. Deng, J. Du, CVPR 2017. Research use only. Copy used: Hugging Face `deanngkl/raf-db-7emotions`.
- **CK+**: P. Lucey et al., CVPR Workshops 2010. Research use only. Copy used: Hugging Face `AlirezaF138/ckplus-dataset`.
- **FER-2013**: I. Goodfellow et al., ICONIP 2013. Copy used: Hugging Face `Jeneral/fer-2013` (test split).
- **RAVDESS**: S. R. Livingstone and F. A. Russo, PLoS ONE 2018. CC BY-NC-SA 4.0. Source: Zenodo record 1188976.
