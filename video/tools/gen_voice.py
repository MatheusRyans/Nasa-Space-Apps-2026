"""Humanized narration with OmniVoice (the engine inside VoiceStudio). Run with the venv that has `omnivoice` installed.
Usage: python tools/gen_voice.py <out_dir> [speed] [instruct]"""
import json, sys, time, logging
import numpy as np, soundfile as sf, torch
from omnivoice.models.omnivoice import OmniVoice
from omnivoice.utils.dtype import tts_dtype_name

SEG = [
  ("s1", "We are, A I need health."),
  ("s2", "Twenty minutes from Earth. No doctor on board. One failing body can put a whole mission at risk."),
  ("s3", "Wireless sensors stream over Bluetooth. No cables. Every reading, instantly."),
  ("s4", "We compare each reading with the astronaut's own baseline, correlate the signals, and rate the risk."),
  ("s5", "Alert. The system tells the crew what to do, and mission control sees it at once."),
  ("s6", "Protecting astronauts. Preserving missions."),
  ("s7", "Make decisions in real time."),
]
out = sys.argv[1]
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
instruct = sys.argv[3] if len(sys.argv) > 3 else "male, middle-aged, moderate pitch, american accent"
logging.basicConfig(level=logging.WARNING)
dev = "cuda" if torch.cuda.is_available() else "cpu"
model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=dev, dtype=getattr(torch, tts_dtype_name(dev)))
res = {}
for sid, text in SEG:
    t0 = time.time()
    a = model.generate(text=text, language="English", instruct=instruct, speed=speed, num_step=32)[0]
    a = a.detach().float().cpu().numpy().squeeze()
    sf.write(f"{out}/{sid}.wav", a, model.sampling_rate, subtype="PCM_16")
    res[sid] = round(len(a) / model.sampling_rate, 3)
    print(sid, res[sid], "s in", round(time.time() - t0), "s", flush=True)
json.dump(res, open(f"{out}/durations.json", "w"))
