"""
Rebuilds the voice test sets used to choose and check the voice emotion model
(see reports/Voice_Emotion_Model_Evaluation.pdf).

    pip install pyarrow soundfile
    python evaluation/voice-model-benchmark/prepare_datasets.py              # downloads ~600 MB
    python evaluation/voice-model-benchmark/prepare_datasets.py --cache DIR  # reuse already-downloaded files

Output (kept out of Git, see README.md):
    datasets/crema-d/<emotion>/*.wav   600 clips: 100 each of anger, disgust, fear, joy, neutral, sadness
    datasets/meld/<emotion>/*.wav      618 clips: up to 100 per emotion, all 7 emotions

The sampling below is the same as in the benchmark, so the clips are identical to what the models were scored on.
"""
import argparse, collections, glob, io, os, random, re, shutil, urllib.request
import pyarrow.parquet as pq

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "datasets")
HF = "https://huggingface.co/api/datasets"
SOURCES = {
    "crema0.parquet":    f"{HF}/mteb/crema-d/parquet/default/train/0.parquet",
    "crema1.parquet":    f"{HF}/mteb/crema-d/parquet/default/train/1.parquet",
    "meld_test.parquet": "https://huggingface.co/datasets/AudioLLMs/meld_emotion_test/resolve/main/data/test-00000-of-00001.parquet",
}
CREMA_CODE = {"ANG": "anger", "DIS": "disgust", "FEA": "fear", "HAP": "joy", "NEU": "neutral", "SAD": "sadness"}


def fetch(name, cache):
    found = glob.glob(os.path.join(cache, "**", name), recursive=True) if cache else []
    if found:
        return found[0]
    dst = os.path.join(OUT, "_downloads", name)
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        print("downloading", name)
        urllib.request.urlretrieve(SOURCES[name], dst)
    return dst


def save(folder, items):
    """items: (wav bytes, emotion, file name) -> datasets/<folder>/<emotion>/<file name>"""
    shutil.rmtree(os.path.join(OUT, folder), ignore_errors=True)
    for wav, emotion, name in items:
        d = os.path.join(OUT, folder, emotion)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, name), "wb") as f:
            f.write(wav)
    print(f"{folder:8} {len(items):5} clips", dict(sorted(collections.Counter(e for _, e, _ in items).items())))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", help="folder (searched recursively) that already holds the parquet files")
    args = ap.parse_args()

    # CREMA-D: 100 random clips per emotion (python seed 0), from 91 actors
    random.seed(0)
    pool = collections.defaultdict(list)
    for f in ("crema0.parquet", "crema1.parquet"):
        for r in pq.read_table(fetch(f, args.cache)).to_pylist():
            pool[CREMA_CODE[r["audio"]["path"].split("_")[2]]].append(r["audio"])
    crema = [(a["bytes"], e, a["path"]) for e, lst in pool.items() for a in random.sample(lst, 100)]
    save("crema-d", crema)

    # MELD official test split (Friends TV show): up to 100 random clips per emotion (python seed 0)
    random.seed(0)
    meld = collections.defaultdict(list)
    for r in pq.read_table(fetch("meld_test.parquet", args.cache)).to_pylist():
        emotion = re.findall(r"\b(neutral|joy|sadness|anger|fear|disgust|surprise)\b", r["answer"].lower())[-1]
        meld[emotion].append(r["context"]["bytes"])
    items = []
    for emotion, lst in meld.items():
        items += [(b, emotion, f"meld_{emotion}_{i:03d}.wav") for i, b in enumerate(random.sample(lst, min(100, len(lst))))]
    save("meld", items)


if __name__ == "__main__":
    main()
