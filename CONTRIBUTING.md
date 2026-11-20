# Contributing to AIneedHealth

Thank you for your interest in improving AIneedHealth. This is a hackathon prototype, so the guidelines below keep changes small, reviewable and safe.

## Ground rules

- **Language.** Code, comments, documentation and commit messages are written in English. Portuguese strings belong only in the translation dictionary in `src/i18n.js` and in localised video captions.
- **No real patient data.** Never commit real health information, personal identifiers or device logs. Use the simulated scenarios in `src/engine.js`.
- **Safety wording.** The app supports self-assessment and decision support. It must not present a result as a diagnosis, and it must not claim that NASA uses or endorses this project.
- **Thresholds are parameters.** Changes to limits, sigma cut-offs or persistence windows must update the medical profile defaults and the explanatory text, and must be justified in the pull request.

## Development setup

```bash
npm run build   # writes dist/index.html and dist/artifact.html
npm test        # engine tests
```

There are no runtime dependencies. The build is a single script (`build.mjs`) that inlines `src/` into `dist/`.

## Before you open a pull request

1. Run `npm test` and make sure every test passes.
2. Run `npm run build` and open `dist/index.html` in a browser. Check both the Astronaut and the Medical team views, in English and in Portuguese.
3. If you change the engine, add or update a test in `test/engine.test.js` that shows the new behaviour.
4. If you change visible text, update both the English and the Portuguese entries in `src/i18n.js`.
5. Keep `dist/` in sync with `src/` (run `npm run build` and commit the result).

## Pull requests

- Keep each pull request focused on one change.
- Describe what changed, why, and how you tested it.
- Include screenshots for visual changes.
- Use a short, imperative commit subject, for example `Add persistence test for route A exit`.

## Reporting issues

Open an issue with the steps to reproduce, the expected behaviour, the actual behaviour and the browser and operating system you used. For classification issues, include the scenario name or the simulated readings involved.
