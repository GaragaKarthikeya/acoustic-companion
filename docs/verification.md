# Verification Guide

Use this checklist before merging or releasing changes. The project has no dedicated unit test suite, so these smoke checks protect the audio timing path, Tauri shell, and static deployment assumptions.

---

## 1. Local Build Checks

Run from the repository root:

```bash
npm ci
npm run build
```

Expected result:
* `npm ci` installs the Tauri CLI dependency from `package-lock.json`.
* `npm run build` runs `tauri build` and writes platform bundles under `src-tauri/target/release/bundle/`.

If `npm` fails before project scripts run, repair the local Node/npm installation first. A missing global `npm-cli.js` is an environment issue, not a project build failure.

---

## 2. Desktop Smoke Test

Run:

```bash
npm run dev
```

Check:
* The app window opens maximized or resizable at the configured Tauri dimensions.
* The audio setup overlay appears.
* Clicking the setup button initializes audio and plays a C chord.
* No blank screen appears. If it does, inspect relative asset paths and `frontendDist`.

---

## 3. Audio Timing Checks

Check these manually after the audio overlay is dismissed:

* **Tuner**: clicking each string plays one pluck at the expected capo-2 reference pitch and briefly highlights the matching fretboard string.
* **Chord cards**: clicking C, Am, G, F, and Fmaj7 plays a strum with normal attack timing.
* **Metronome**: starting the metronome produces steady eighth-note pulses at the selected BPM.
* **Tap tempo**: tapping updates BPM and clamps values between 50 and 160.
* **Riff player**: playback follows the selected speed multiplier without slowing down over the loop.
* **Practice Mode**: bars advance on pulse 0, transition warnings appear before chord changes, and stopping clears highlights.

The audio synthesis hot path in `www/js/audio.js` should use direct `Float32Array` indexing. Do not replace per-sample reads or writes with `Reflect.get()` or `Reflect.set()`.

---

## 4. Static Hosting Check

For Vercel or any static host:

* Serve the `www` directory as the site root.
* Confirm `index.html` loads `./style.css` and `./app.js` through relative paths.
* Confirm browser devtools show no module import 404s.
* Confirm audio still requires a user gesture before playback starts.

---

## 5. Release Workflow Check

Before pushing a release tag:

* Update matching versions in `package.json` and `src-tauri/tauri.conf.json`.
* Push the version commit to `main`.
* Push a matching `vX.Y.Z` tag.
* Confirm `.github/workflows/publish.yml` completes on macOS, Windows, and Linux.
* Confirm the draft GitHub Release contains normalized installer artifacts.
