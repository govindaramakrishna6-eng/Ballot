# Generates the narration clips: python voice.py <kokoro-int8-multi-lang-v1_0 dir> e2e/explainer-script.json <out dir>
# Needs: pip install sherpa-onnx soundfile. The model dir must contain lexicon-custom.txt (see docs/BUILD_LOG.md).
import sys, json, sherpa_onnx, soundfile as sf
M, script, out = sys.argv[1], sys.argv[2], sys.argv[3]
lines = json.load(open(script))
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
  model=f"{M}/model.int8.onnx", voices=f"{M}/voices.bin", tokens=f"{M}/tokens.txt", data_dir=f"{M}/espeak-ng-data",
  lexicon=f"{M}/lexicon-custom.txt", lang="en-us"), num_threads=4))
tts = sherpa_onnx.OfflineTts(cfg)
durs = []
for i, l in enumerate(lines):
    a = tts.generate(l["text"], sid=3, speed=0.95)
    sf.write(f"{out}/{i:02d}.wav", a.samples, a.sample_rate)
    durs.append(round(len(a.samples) / a.sample_rate, 3))
    print(i, durs[-1], flush=True)
json.dump(durs, open(f"{out}/durs.json", "w"))
print("total", round(sum(durs), 1))
