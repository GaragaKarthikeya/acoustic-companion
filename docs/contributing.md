# Contribution & Developer Guide

Acoustic Session welcomes open-source contributions. This document serves as a guide for setting up the local environment, building the native application, and packaging public releases.

---

## 1. Local Development Setup

To establish a local debug environment for compilation:

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **Rust Toolchain**: Install via `rustup` to get the latest stable Rust compiler (`rustc`) and Cargo.
* **WebView2 Runtime**: Included by default in Windows 10/11.

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/acoustic_companion.git
   cd acoustic_companion
   ```
2. Open in your preferred editor (e.g. VS Code).
3. The frontend static assets are completely self-contained under `/www` and the Tauri Rust bindings are located in `/src-tauri`.

---

## 2. Developer Commands

Tauri's CLI compiles and bundles both frontend assets and backend Rust crates seamlessly:

### Run in Local Development Mode
This launches a local debug window with hot-reloading and Rust logs enabled:
```bash
npx tauri dev
```

### Compile Production Binaries
This builds highly optimized desktop executables and installers:
```bash
npx tauri build
```
* **NSIS Setup Installer**: Generates `src-tauri/target/release/bundle/nsis/acoustic_companion_0.1.0_x64-setup.exe`
* **Enterprise MSI Installer**: Generates `src-tauri/target/release/bundle/msi/acoustic_companion_0.1.0_x64_en-US.msi`

---

## 3. GitHub Releases & Distribution

When publishing new releases:
1. Compile the production executables using `npx tauri build`.
2. Draft a new release on GitHub matching the version specified in `src-tauri/tauri.conf.json`.
3. Upload the compiled NSIS `.exe` setup installer and MSI package directly to the release assets.
4. Future updates are automatically delivered if configured with Tauri's native updater channel.

---

## 4. Vercel Static Web Deployment

The `/www` directory is fully standard-compliant and can be hosted statically on Vercel:

1. Import the repository into your Vercel Dashboard.
2. Configure **Project Settings**:
   * **Framework Preset**: `Other`
   * **Root Directory**: `www` *(Crucial: This isolates the web pages and skips Tauri's Rust directories during cloud building)*
3. Click **Deploy**. Vercel will serve your ES modules globally over high-speed static CDNs.
