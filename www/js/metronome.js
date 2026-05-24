import { synthState } from "./state.js";
import { audioCtx, playBeatClick, initAudioEngine } from "./audio.js";
import { tickPracticeProgress } from "./lyrics.js";

let nextNoteTime = 0.0;
let currentPulse = 0;
let schedulerTimer = null;
const LOOKAHEAD = 25.0;
const SCHEDULE_WINDOW = 50.0;

export function resetNextNoteTime(time) {
    nextNoteTime = time;
}

export function getCurrentPulse() {
    return currentPulse;
}

export function resetCurrentPulse() {
    currentPulse = 0;
}

export function startMetronome() {
    if (synthState.isMetronomeRunning) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    nextNoteTime = audioCtx.currentTime + 0.05;
    currentPulse = 0;
    synthState.isMetronomeRunning = true;

    const icon = document.getElementById("metro-play-icon");
    if (icon) {
        icon.setAttribute("data-lucide", "pause");
        lucide.createIcons();
    }

    metronomeScheduler();
}

export function stopMetronome() {
    if (!synthState.isMetronomeRunning) return;
    clearTimeout(schedulerTimer);
    synthState.isMetronomeRunning = false;

    const icon = document.getElementById("metro-play-icon");
    if (icon) {
        icon.setAttribute("data-lucide", "play");
        lucide.createIcons();
    }

    document.querySelectorAll(".beat-pad").forEach(p => p.classList.remove("active"));
}

function metronomeScheduler() {
    while (nextNoteTime < audioCtx.currentTime + (SCHEDULE_WINDOW / 1000)) {
        scheduleBeat(currentPulse, nextNoteTime);
        advanceBeat();
    }
    schedulerTimer = setTimeout(metronomeScheduler, LOOKAHEAD);
}

function scheduleBeat(pulse, time) {
    playBeatClick(pulse, time);
    const wait = time - audioCtx.currentTime;
    setTimeout(() => visualFlashBeat(pulse), Math.max(0, wait * 1000));
}

function advanceBeat() {
    nextNoteTime += 0.5 * (60.0 / synthState.bpm);
    currentPulse = (currentPulse + 1) % 8;
}

export function visualFlashBeat(pulse) {
    document.querySelectorAll(".beat-pad").forEach(p => p.classList.remove("active"));
    const pad = document.getElementById(`beat-pad-${pulse}`);
    if (pad) pad.classList.add("active");

    if (synthState.isPracticeRunning) {
        tickPracticeProgress(pulse);
    }
}

export function renderBeatGrid() {
    const grid = document.getElementById("beat-visual-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const BEATS = [
        { label: "1", arrow: "↓", accent: true },
        { label: "&", arrow: "↓", accent: false },
        { label: "2", arrow: "↓", accent: false },
        { label: "&", arrow: "↓", accent: true },
        { label: "3", arrow: "↓", accent: false },
        { label: "&", arrow: "↓", accent: false },
        { label: "4", arrow: "↓", accent: false },
        { label: "&", arrow: "↓", accent: true }
    ];

    BEATS.forEach((beat, i) => {
        const pad = document.createElement("div");
        pad.className = `beat-pad ${beat.accent ? "accent" : ""}`;
        pad.id = `beat-pad-${i}`;
        pad.innerHTML = `
            ${beat.accent ? '<div class="accent-indicator"></div>' : ""}
            <span class="beat-num">${beat.label}</span>
            <span class="strum-arrow-indicator">${beat.arrow}</span>
        `;
        grid.appendChild(pad);
    });
}

export function setupMetronomeUI() {
    const toggleBtn = document.getElementById("metronome-toggle");
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmVal = document.getElementById("bpm-val");
    const soundBtn = document.getElementById("metro-sound-toggle");
    const tapBtn = document.getElementById("tap-tempo-btn");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            initAudioEngine();
            synthState.isMetronomeRunning ? stopMetronome() : startMetronome();
        });
    }

    if (bpmSlider) {
        bpmSlider.addEventListener("input", e => {
            synthState.bpm = parseInt(e.target.value);
            if (bpmVal) bpmVal.textContent = synthState.bpm;
        });
    }

    if (soundBtn) {
        soundBtn.addEventListener("click", () => {
            synthState.soundEnabled = !synthState.soundEnabled;
            soundBtn.classList.toggle("active", synthState.soundEnabled);
            soundBtn.classList.toggle("muted", !synthState.soundEnabled);
            soundBtn.innerHTML = synthState.soundEnabled
                ? '<i data-lucide="volume-2"></i>'
                : '<i data-lucide="volume-x"></i>';
            lucide.createIcons();
        });
    }

    let tapTimes = [];
    if (tapBtn) {
        tapBtn.addEventListener("click", () => {
            const now = performance.now();
            tapTimes = tapTimes.filter(t => now - t < 2200);
            tapTimes.push(now);

            if (tapTimes.length >= 2) {
                const intervals = [];
                for (let i = 1; i < tapTimes.length; i++) {
                    intervals.push(tapTimes[i] - tapTimes[i - 1]);
                }
                const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const bpm = Math.min(160, Math.max(50, Math.round(60000 / avg)));
                synthState.bpm = bpm;
                if (bpmSlider) bpmSlider.value = bpm;
                if (bpmVal) bpmVal.textContent = bpm;
            }
        });
    }
}
