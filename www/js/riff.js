import { synthState, getFretFrequency } from "./state.js";
import { audioCtx, pluckString, initAudioEngine } from "./audio.js";
import { updateFretboardPluck, clearActiveNeckFingers } from "./fretboard.js";
import { stopMetronome } from "./metronome.js";
import { stopPracticeMode } from "./lyrics.js";

// Riff melody sequence
export const RIFF_SEQUENCE = [
    // Bar 1: C
    { string: 5, fret: 3, len: 1, finger: "3" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 2, fret: 0, len: 1, finger: "0" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 5, fret: 3, len: 1, finger: "3" },
    { string: 3, fret: 0, len: 1, finger: "0" },
    { string: 4, fret: 3, len: 1, finger: "4" },
    { string: 4, fret: 2, len: 1, finger: "2" },
    // Bar 2: Am
    { string: 5, fret: 0, len: 1, finger: "0" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 2, fret: 0, len: 1, finger: "0" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 5, fret: 0, len: 1, finger: "0" },
    { string: 3, fret: 0, len: 1, finger: "0" },
    { string: 4, fret: 3, len: 1, finger: "4" },
    { string: 4, fret: 2, len: 1, finger: "2" },
    // Bar 3: G
    { string: 6, fret: 3, len: 1, finger: "2" },
    { string: 2, fret: 3, len: 1, finger: "3" },
    { string: 2, fret: 0, len: 1, finger: "0" },
    { string: 2, fret: 3, len: 1, finger: "3" },
    { string: 6, fret: 3, len: 1, finger: "2" },
    { string: 3, fret: 0, len: 1, finger: "0" },
    { string: 4, fret: 3, len: 1, finger: "4" },
    { string: 4, fret: 0, len: 1, finger: "0" },
    // Bar 4: F
    { string: 6, fret: 1, len: 1, finger: "T" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 2, fret: 0, len: 1, finger: "0" },
    { string: 2, fret: 1, len: 1, finger: "1" },
    { string: 6, fret: 1, len: 1, finger: "T" },
    { string: 3, fret: 0, len: 1, finger: "0" },
    { string: 4, fret: 3, len: 1, finger: "4" },
    { string: 4, fret: 2, len: 1, finger: "2" }
];

let riffTimeout = null;
let currentRiffIndex = 0;

export function renderRiffTab() {
    const wrapper = document.getElementById("guitar-tab-container");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tab-track-container";

    const STRINGS = [1, 2, 3, 4, 5, 6];
    const LABELS = { 1: "e|", 2: "B|", 3: "G|", 4: "D|", 5: "A|", 6: "E|" };
    const totalSlots = RIFF_SEQUENCE.length * 3;
    const linesData = {};

    STRINGS.forEach(s => {
        linesData[s] = [];
        for (let i = 0; i < totalSlots; i++) linesData[s].push("-");
    });

    RIFF_SEQUENCE.forEach((note, idx) => {
        linesData[note.string][idx * 3 + 1] = note.fret.toString();
    });

    STRINGS.forEach(sNum => {
        const lineDiv = document.createElement("div");
        lineDiv.className = "tab-string-line";

        const label = document.createElement("span");
        label.className = "tab-string-label";
        label.textContent = LABELS[sNum];
        lineDiv.appendChild(label);

        for (let i = 0; i < totalSlots; i++) {
            const charSpan = document.createElement("span");
            charSpan.className = "tab-note-char";
            charSpan.textContent = linesData[sNum][i];

            const isFret = linesData[sNum][i] !== "-";
            const noteIdx = Math.floor(i / 3);

            if (isFret && RIFF_SEQUENCE[noteIdx] && RIFF_SEQUENCE[noteIdx].string === sNum) {
                charSpan.classList.add("clickable-note");
                charSpan.id = `tab-note-${noteIdx}`;

                const noteVal = RIFF_SEQUENCE[noteIdx];
                charSpan.addEventListener("click", () => {
                    initAudioEngine();
                    pluckString(getFretFrequency(noteVal.string, noteVal.fret), 0, 1.8, 0.7);
                    updateFretboardPluck(noteVal.string, noteVal.fret, noteVal.finger || "");
                    charSpan.classList.add("playing");
                    setTimeout(() => charSpan.classList.remove("playing"), 150);
                });
            }

            lineDiv.appendChild(charSpan);
        }

        const endLabel = document.createElement("span");
        endLabel.className = "tab-string-label";
        endLabel.style.textAlign = "left";
        endLabel.textContent = "|";
        lineDiv.appendChild(endLabel);

        container.appendChild(lineDiv);
    });

    const cursor = document.createElement("div");
    cursor.className = "playback-cursor";
    cursor.id = "tab-playback-cursor";
    cursor.style.display = "none";
    cursor.style.left = "16px";
    container.appendChild(cursor);

    wrapper.appendChild(container);
}

export function startRiffPlayback() {
    if (synthState.isRiffPlaying) return;
    initAudioEngine();
    if (audioCtx.state === "suspended") audioCtx.resume();

    synthState.isRiffPlaying = true;
    currentRiffIndex = 0;

    const btn = document.getElementById("riff-play-btn");
    if (btn) {
        btn.innerHTML = '<i data-lucide="square"></i> Stop';
        lucide.createIcons();
    }

    const cursor = document.getElementById("tab-playback-cursor");
    if (cursor) cursor.style.display = "block";

    playNextRiffNote();
}

export function stopRiffPlayback() {
    if (!synthState.isRiffPlaying) return;
    clearTimeout(riffTimeout);
    synthState.isRiffPlaying = false;

    const btn = document.getElementById("riff-play-btn");
    if (btn) {
        btn.innerHTML = '<i data-lucide="play"></i> Play Riff';
        lucide.createIcons();
    }

    const cursor = document.getElementById("tab-playback-cursor");
    if (cursor) cursor.style.display = "none";
    document.querySelectorAll(".tab-note-char").forEach(c => c.classList.remove("playing"));

    clearActiveNeckFingers();
}

function playNextRiffNote() {
    if (!synthState.isRiffPlaying) return;
    if (currentRiffIndex >= RIFF_SEQUENCE.length) currentRiffIndex = 0;

    const note = RIFF_SEQUENCE[currentRiffIndex];
    const freq = getFretFrequency(note.string, note.fret);

    if (synthState.soundEnabled) pluckString(freq, 0, 1.6, 0.7);
    updateFretboardPluck(note.string, note.fret, note.finger || "");

    document.querySelectorAll(".tab-note-char").forEach(c => c.classList.remove("playing"));
    const noteSpan = document.getElementById(`tab-note-${currentRiffIndex}`);
    if (noteSpan) {
        noteSpan.classList.add("playing");
        const cursor = document.getElementById("tab-playback-cursor");
        if (cursor) {
            cursor.style.left = `${16 + (currentRiffIndex * 3 + 1) * 8.5}px`;
        }
    }

    const eighthMs = 0.5 * (60000 / synthState.bpm);
    const delay = (eighthMs * note.len) / synthState.speedMultiplier;
    currentRiffIndex++;
    riffTimeout = setTimeout(playNextRiffNote, delay);
}

export function setupRiffUI() {
    const btn = document.getElementById("riff-play-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            if (synthState.isRiffPlaying) {
                stopRiffPlayback();
            } else {
                stopMetronome();
                stopPracticeMode();
                startRiffPlayback();
            }
        });
    }

    document.querySelectorAll(".speed-selector button").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".speed-selector button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            synthState.speedMultiplier = parseFloat(btn.dataset.speed);
        });
    });
}
