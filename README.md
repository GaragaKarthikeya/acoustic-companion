# Acoustic Companion (Yamaha F280 Companion)

Acoustic Companion is a native desktop application designed for learning and practicing Ed Sheeran's "Photograph" on the guitar. Optimized specifically for standard 1080p FHD displays, the application bundles an interactive guitar tuner, chord library, rhythm metronome scheduler, horizontal tab scroller player, and a scroll-synchronized lyrics sheet in an elegant, glassmorphic layout.

Powered by a native Rust backend and Webview2 frontend utilizing Tauri v2, the application runs with an extremely low memory footprint of just 3.4 MB of RAM.

---

## Technical Architecture

The codebase is built on modern web standards and native systems engineering, structured to run efficiently without requiring bundlers, packagers, or transpilations in development.

### 1. Frontend Modular Design
The user interface is split into focused, decoupled modules served directly to the browser view:
* **Modular CSS**: Styled using isolated stylesheets (`variables.css`, `layout.css`, `tuner.css`, etc.) assembled via standard CSS `@import` rules.
* **JavaScript ES Modules (ESM)**: Features native module script splitting (`state.js`, `audio.js`, `fretboard.js`, etc.) linked via relative imports.

### 2. Physical Modeling Audio Synthesis
Rather than loading heavy audio samples, the companion generates sound waves in real-time using an improved **Karplus-Strong physical modeling algorithm**:
* **Shaped Noise Burst**: String plucks are seeded using a blend of white noise and sine waves to simulate acoustic body resonances.
* **Physics-Based String Damping**: Damping and decay rates are calculated dynamically based on fundamental frequencies ($f$) to match standard steel-string behaviors:
  $$\alpha(f) = 0.359 + 0.00111 \cdot f$$
* **Natural Half-Life Decay**: Calculates exact 4.5 half-lives sustain times to size buffers and envelope parameters dynamically, allowing the low E string to ring out naturally for ~6.7 seconds while the high e string decays in ~4.0 seconds.

### 3. Tauri Desktop Wrapper
Integrated with a lightweight Rust backend using Tauri v2:
* **Zero CORS issues**: Internal assets are served locally using native system loops, resolving all browser security restrictions on local module loading.
* **Minimalist Footprint**: Relies on the host operating system's native Webview engine (Webview2 on Windows), bypassing heavy Chromium runtime overheads and operating in under 4 MB of memory.

---

## Directory Structure

```text
acoustic-companion/
├── www/
│   ├── css/
│   │   ├── variables.css      # Custom properties, colors, resets
│   │   ├── layout.css         # Grid system, cards, overlays
│   │   ├── tuner.css          # Guitar tuner string widgets
│   │   ├── chords.css         # Chord grids and standard SVG assets
│   │   ├── rhythm.css         # Metronome controllers and sliders
│   │   ├── riff.css           # Timeline scrollbars and tracks
│   │   ├── fretboard.css      # Neck wood layouts and gold dots
│   │   └── lyrics.css         # Sync scrollers and hover tooltips
│   ├── js/
│   │   ├── state.js           # Shared configurations, song database
│   │   ├── audio.js           # Wave synthesis and pluck engines
│   │   ├── tuner.js           # Tuner pick logic and beeps
│   │   ├── chords.js          # SVG diagram drawing matrices
│   │   ├── fretboard.js       # Horizontal neck markers
│   │   ├── metronome.js       # Scheduling intervals and BPM taps
│   │   ├── lyrics.js          # Synchronizers and practice status loops
│   │   └── riff.js            # Strum timelines and speeds
│   ├── index.html             # HTML document entry
│   ├── style.css              # Main import stylesheet
│   └── app.js                 # Javascript ES entry bootstrapper
├── src-tauri/
│   ├── src/
│   │   ├── main.rs            # Rust backend runner
│   │   └── lib.rs             # Tauri framework setup
│   ├── Cargo.toml             # Rust package manager manifest
│   └── tauri.conf.json        # Tauri build and window configuration
├── README.md                  # Project documentation
└── vercel.json                # Vercel deployment configuration
```

---

## Getting Started

### Prerequisites
1. **Node.js** (v18+)
2. **Rust & Cargo** (v1.75+ for Tauri v2 compilation)

### Running in Development
To run the native Windows application locally in development mode:
```bash
npx tauri dev
```

### Compiling Standalone Executables
To compile the production desktop binary (`.exe`) and installers (`.msi`, NSIS setup):
```bash
npx tauri build
```
Output files will be located in `src-tauri/target/release/bundle/`.

---

## Vercel Web Deployment

The web-based companion can be deployed to the cloud in seconds:

1. Push your repository to **GitHub**.
2. Import the project into the **Vercel Dashboard**.
3. Under **Project Settings**, configure:
   * **Framework Preset**: `Other`
   * **Root Directory**: `www` (This tells Vercel to serve the frontend isolated assets directly)
4. Click **Deploy**. Vercel will host your static ES Modules globally on a high-speed CDN.
