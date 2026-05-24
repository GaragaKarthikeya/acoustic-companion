import { compilePracticeMap } from "./js/state.js";
import { audioCtx, playStrummedChord, initAudioEngine } from "./js/audio.js";
import { drawFretboard } from "./js/fretboard.js";
import { renderChordLibrary } from "./js/chords.js";
import { renderBeatGrid, setupMetronomeUI } from "./js/metronome.js";
import { renderRiffTab, setupRiffUI } from "./js/riff.js";
import { setupTunerUI } from "./js/tuner.js";
import { setupPracticeUI, renderPracticeBoard } from "./js/lyrics.js";

// ─── Fullscreen Init Overlay ──────────────────────────────────────────────────
function setupInitOverlay() {
    const overlay = document.getElementById("audio-init-overlay");
    const btn = document.getElementById("btn-init-audio");

    if (btn && overlay) {
        btn.addEventListener("click", () => {
            initAudioEngine();
            if (audioCtx.state === "suspended") audioCtx.resume();
            playStrummedChord("c", 2.2, 0.45);
            overlay.classList.add("hidden");
        });
    }
}

// ─── Bootstrap Dashboard ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    // 1. Render all visual components
    drawFretboard();
    renderChordLibrary();
    renderBeatGrid();
    renderRiffTab();

    // 2. Compile lyrics scroller map & draw song sheets
    compilePracticeMap();
    renderPracticeBoard();

    // 3. Setup event bindings & controllers
    setupMetronomeUI();
    setupRiffUI();
    setupTunerUI();
    setupPracticeUI();
    setupInitOverlay();
});
