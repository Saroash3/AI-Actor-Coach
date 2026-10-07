"""
Rebuilds the exact test sets used to choose the facial emotion model
(see reports/Facial_Emotion_Model_Evaluation.pdf).

    pip install pyarrow pillow numpy
    python evaluation/face-model-benchmark/prepare_datasets.py              # downloads everything (~2.7 GB)
    python evaluation/face-model-benchmark/prepare_datasets.py --cache DIR  # reuse already-downloaded files

Output (kept out of Git, see README.md for why):
    datasets/raf-db/<emotion>/*.png     1,800 real-world faces (300 per emotion)
    datasets/ckplus/<emotion>/*.png       927 posed faces
    datasets/fer2013/<emotion>/*.png    1,000 faces (fixed random sample of the 7,178-face test split)
    datasets/ravdess/*.mp4                240 acted video clips (actors 01, 04, 05, 06)

The sampling below is the same as in the benchmark, so the files are identical to what the models were scored on.
"""
import argparse, collections, glob, io, os, random, shutil, urllib.request, zipfile
import numpy as np
import pyarrow.parquet as pq
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "datasets")
SEVEN = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]  # the app's emotions
HF = "https://huggingface.co/api/datasets"
SOURCES = {
    "fer_test.parquet": f"{HF}/Jeneral/fer-2013/parquet/default/test/0.parquet",
    "ckplus.parquet":   f"{HF}/AlirezaF138/ckplus-dataset/parquet/default/train/0.parquet",
    **{f"raf{i}.parquet": f"{HF}/deanngkl/raf-db-7emotions/parquet/default/train/{i}.parquet" for i in range(4)},
}
RAVDESS_ACTORS = ["01", "04", "05", "06"]
RAVDESS_EMOTION = {"01": "neutral", "02": "calm", "03": "joy", "04": "sadness", "05": "anger", "06": "fear", "07": "disgust", "08": "surprise"}


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
    """items: (PIL image, emotion) pairs -> datasets/<folder>/<emotion>/<n>.png"""
    shutil.rmtree(os.path.join(OUT, folder), ignore_errors=True)
    for n, (img, emo) in enumerate(items):
        d = os.path.join(OUT, folder, emo)
        os.makedirs(d, exist_ok=True)
        img.save(os.path.join(d, f"{n:04d}.png"))
    print(f"{folder:8} {len(items):5} faces", dict(sorted(collections.Counter(e for _, e in items).items())))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", help="folder (searched recursively) that already holds the parquet files and/or RAVDESS Actor_XX folders")
    args = ap.parse_args()

    # FER-2013 public test split: fixed random sample of 1,000 (numpy seed 0, as in the benchmark)
    rows = pq.read_table(fetch("fer_test.parquet", args.cache)).to_pylist()
    idx = np.sort(np.random.default_rng(0).choice(len(rows), 1000, replace=False))
    save("fer2013", [(Image.open(io.BytesIO(rows[i]["img_bytes"])), SEVEN[rows[i]["labels"]]) for i in idx])

    # CK+: every face except "contempt" (not one of the app's emotions)
    ckmap = {"anger": "anger", "disgust": "disgust", "fear": "fear", "happy": "joy", "sadness": "sadness", "surprise": "surprise"}
    rows = pq.read_table(fetch("ckplus.parquet", args.cache)).to_pylist()
    save("ckplus", [(Image.open(io.BytesIO(r["image"]["bytes"])), ckmap[r["label"]]) for r in rows if r["label"] in ckmap])

    # RAF-DB aligned 100x100 faces: 300 per emotion (python seed 0, as in the benchmark)
    random.seed(0)
    pool = collections.defaultdict(list)
    for i in range(4):
        for r in pq.read_table(fetch(f"raf{i}.parquet", args.cache)).to_pylist():
            im = Image.open(io.BytesIO(r["image"]["bytes"]))
            if im.size == (100, 100):
                pool[SEVEN[r["label"]]].append(im)
    items = []
    for emo, ims in pool.items():
        random.shuffle(ims)
        items += [(im, emo) for im in ims[:300]]
    save("raf-db", items)

    # RAVDESS speech video (audio+video files, 01-01-*), actors 01, 04, 05, 06
    dst = os.path.join(OUT, "ravdess")
    os.makedirs(dst, exist_ok=True)
    for a in RAVDESS_ACTORS:
        cached = glob.glob(os.path.join(args.cache, "**", f"Actor_{a}", "01-01-*.mp4"), recursive=True) if args.cache else []
        if not cached:
            z = os.path.join(OUT, "_downloads", f"Video_Speech_Actor_{a}.zip")
            if not os.path.exists(z):
                print("downloading RAVDESS actor", a)
                urllib.request.urlretrieve(f"https://zenodo.org/api/records/1188976/files/Video_Speech_Actor_{a}.zip/content", z)
            with zipfile.ZipFile(z) as zf:
                for m in zf.namelist():
                    if os.path.basename(m).startswith("01-01-"):
                        with zf.open(m) as src, open(os.path.join(dst, os.path.basename(m)), "wb") as out:
                            shutil.copyfileobj(src, out)
        else:
            for f in cached:
                shutil.copy2(f, dst)
    clips = sorted(glob.glob(os.path.join(dst, "*.mp4")))
    print(f"ravdess  {len(clips):5} clips", dict(sorted(collections.Counter(RAVDESS_EMOTION[os.path.basename(c).split('-')[2]] for c in clips).items())))


if __name__ == "__main__":
    main()
