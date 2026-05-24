# Contribution & Developer Guide

Acoustic Companion welcomes open-source contributions. This document serves as a guide for setting up the local environment, building the native application, and packaging public releases.

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
   git clone https://github.com/GaragaKarthikeya/acoustic-companion.git
   cd acoustic-companion
   ```
2. Install frontend and CLI dependencies:
   ```bash
   npm install
   ```
3. Open in your preferred editor (e.g. VS Code).
4. The frontend static assets are completely self-contained under `/www` and the Tauri Rust bindings are located in `/src-tauri`.

---

## 2. Developer Commands

Tauri's CLI compiles and bundles both frontend assets and backend Rust crates seamlessly. Since we have a root `package.json` configured:

### Run in Local Development Mode
This launches a local debug window with hot-reloading and Rust logs enabled:
```bash
npm run dev
```

### Compile Production Binaries
This builds highly optimized desktop executables and installers:
```bash
npm run build
```
* **NSIS Setup Installer**: Generates `src-tauri/target/release/bundle/nsis/acoustic_companion_0.1.0_x64-setup.exe`
* **Enterprise MSI Installer**: Generates `src-tauri/target/release/bundle/msi/acoustic_companion_0.1.0_x64_en-US.msi`

---

## 3. GitHub Releases & Distribution

When publishing new releases:
1. Compile the production executables locally using `npm run build` or use the automated CI/CD pipeline (see Section 5).
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

---

## 5. Automated CI/CD Releases (GitHub Actions)

A GitHub Actions workflow is pre-configured at `.github/workflows/publish.yml` to automatically build and release the application:

### How to Trigger an Automated Release Build
1. Update the version inside `src-tauri/tauri.conf.json` and `package.json` (e.g., `"0.2.0"`).
2. Commit and push the changes to `main`.
3. Tag the commit with your new version prefixed with a `v` and push it:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
4. GitHub Actions will automatically provision virtual environments for **Windows** and **macOS**, compile release binaries for both platforms (including universal Apple Silicon/Intel binaries for macOS), draft a new release page, and upload the installers/executables to that release draft!
5. Navigate to your repository's **Releases** tab, review the compiled drafts, and click **Publish Release** when ready.

