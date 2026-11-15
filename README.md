# AIneedHealth

Crew health self-assessment prototype for NASA Space Apps 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

The astronaut checks in, the system compares each value with the astronaut's own baseline and with absolute safety limits, explains the result and says what to do and when to contact the flight medical team. It does not diagnose.

All data in this repository is simulated.

## Run

```bash
npm run build      # writes dist/index.html and dist/artifact.html
npm test           # engine tests (node:test, no dependencies)
```

Open `dist/index.html` in a browser. No server or network is needed, except for the font.

## How it classifies (4 levels)

| Level | Color | Comes from |
| --- | --- | --- |
| GOOD | green | no relevant deviation |
| ALERT | yellow | route A: moderate, persistent deviation from the baseline |
| ATTENTION | orange | route A: significant deviation, or route B: absolute limit 1 |
| CRITICAL EMERGENCY | red | route B: absolute limit 2 confirmed on two readings, or the emergency protocol |

- **Route A (trend):** deviation in sigma (points on scales) against the individual baseline, 3 days of persistence, hysteresis on exit.
- **Route B (safety):** absolute limits act at once. The first reading raises attention and asks for a repeat; two consecutive readings confirm.
- **Patterns:** two or more concordant indicators activate operational fatigue, dust exposure after an EVA, or an atypical cardiovascular response.
- **Emergency:** detected from a simulated sensor stream (heart rate, motion, signal quality), with a verification step. Sleep and sensor loss never raise an emergency by themselves.
- **Long-term capacity** (aerobic, strength, bone, dose) follows NASA-STD-3001 Vol. 1 Rev C and appears as a separate seal.

Every threshold is a parameter of the Medical Profile, which the flight medical team sets. The values in this prototype are demonstration values.

## Structure

```
src/engine.js   pure classification engine (no DOM)
src/i18n.js     English (default) and Portuguese
src/fx.js       visual effects (constellation grid, live ECG trace, dust particles, count-up, scan)
src/app.js      interface
src/style.css   styles
src/body.html   page markup
build.mjs       inlines everything into dist/
test/           engine tests
```

## Limits to keep in mind

- Simulated data and a simulated sensor stream; no real device is integrated.
- Thresholds, sigma cutoffs and persistence windows are project parameters, not NASA values, and are not clinically validated.
- NASA-STD-3001 Vol. 1 does not define numeric vital-sign limits.
- The false-alarm test assumes independent, Gaussian noise; real data is autocorrelated and will alarm more often.
