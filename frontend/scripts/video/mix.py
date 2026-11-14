# Mixes the narration clips into the recorded video at the moments each beat started, and writes matching subtitles.
# Run from frontend/: python3 scripts/video/mix.py <clips dir with NN.wav + durs.json>
import json, subprocess, sys
clips = sys.argv[1]
m = json.load(open("test-results/explainer-marks.json"))
durs = json.load(open(f"{clips}/durs.json"))
script = json.load(open("e2e/explainer-script.json"))
trim, total = m["trimStartMs"] / 1000, round(m["endMs"] / 1000, 2)
ins, parts, labels = [], [], []
for i, t in enumerate(m["marksMs"]):
    d = int(t) + 150  # let the subtitle appear a beat before the voice
    ins += ["-i", f"{clips}/{i:02d}.wav"]
    parts.append(f"[{i+1}:a]adelay={d}|{d}[a{i}]")
    labels.append(f"[a{i}]")
audio = (";".join(parts) + ";" + "".join(labels) +
         f"amix=inputs={len(labels)}:normalize=0,apad,atrim=0:{total},loudnorm=I=-16:TP=-1.5:LRA=11,"
         f"aformat=sample_rates=48000:channel_layouts=stereo,afade=t=out:st={total-0.6}:d=0.6[a]")
video = (f"[0:v]trim=start={trim}:duration={total},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.4,"
         f"fade=t=out:st={total-0.8}:d=0.8,format=yuv420p[v]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "test-results/explainer-explainer-video/video.webm", *ins,
                "-filter_complex", f"{video};{audio}", "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow",
                "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
                "../docs/ballot-explainer.mp4"], check=True)

def ts(s):
    ms = int(round(s * 1000))
    return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
with open("../docs/ballot-voiceover.srt", "w") as out:
    for i, (t, d) in enumerate(zip(m["marksMs"], durs)):
        a = (t + 150) / 1000
        out.write(f"{i+1}\n{ts(a)} --> {ts(a + d)}\n{script[i]['text']}\n\n")
print("total", total)
