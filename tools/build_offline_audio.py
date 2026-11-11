"""Synthesise the bundled American-English pronunciation clips.

    node tools/collect_pronunciation_texts.js clips.json
    python tools/build_offline_audio.py clips.json kokoro-v1.0.onnx voices-v1.0.bin

Needs `pip install kokoro-onnx` and ffmpeg. The model files come from the
kokoro-onnx GitHub releases. Existing clips are kept, so reruns only add new text;
clips whose text no longer appears in the app are removed.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro

VOICE = "af_heart"
OUT = Path(__file__).resolve().parent.parent / "audio" / "us"
EDGE_SILENCE = 0.04  # seconds of quiet kept at each end


def trim(samples, rate):
    loud = np.flatnonzero(np.abs(samples) > 0.01)
    if not len(loud):
        return samples
    pad = int(rate * EDGE_SILENCE)
    return samples[max(0, loud[0] - pad):loud[-1] + pad]


def main():
    clips = json.load(open(sys.argv[1], encoding="utf-8"))
    kokoro = Kokoro(sys.argv[2], sys.argv[3])
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in OUT.glob("*.mp3"):
        if stale.stem not in clips:
            stale.unlink()
    for count, (key, text) in enumerate(sorted(clips.items()), 1):
        target = OUT / f"{key}.mp3"
        if target.exists():
            continue
        samples, rate = kokoro.create(text, voice=VOICE, speed=1.0, lang="en-us")
        samples = trim(np.asarray(samples, dtype=np.float32), rate)
        peak = float(np.abs(samples).max()) or 1.0
        samples = samples * (0.89 / peak)  # normalise every clip to -1 dBFS
        partial = target.with_suffix(".part")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(rate), "-ac", "1",
             "-i", "-", "-codec:a", "libmp3lame", "-b:a", "40k", "-f", "mp3", str(partial)],
            input=samples.tobytes(), check=True)
        partial.rename(target)
        if count % 100 == 0:
            print(f"{count}/{len(clips)}", flush=True)
    keys = sorted(clips)
    size = sum((OUT / f"{key}.mp3").stat().st_size for key in keys)
    json.dump({"voice": VOICE, "bytes": size, "keys": keys}, open(OUT / "index.json", "w"))
    print(f"done: {len(keys)} clips, {size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
