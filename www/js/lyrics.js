import { 
    synthState, SONG_STRUCTURE, CHORD_LIBRARY, STRUM_STYLES, 
    flatPracticeMap, totalPracticeBars, currentPracticeBar,
    compilePracticeMap, incrementPracticeBar, resetPracticeBar, setPracticeBar 
} from "./state.js";
import { audioCtx, playStrummedChord, initAudioEngine } from "./audio.js";
import { updateFretboardChord, drawFretboard, clearActiveNeckFingers } from "./fretboard.js";
import { startMetronome, stopMetronome, resetNextNoteTime } from "./metronome.js";
import { buildChordSVG } from "./chords.js";
import { stopRiffPlayback } from "./riff.js";

export function setupPracticeUI() {
    const btn = document.getElementById("practice-mode-toggle");

    if (btn) {
        btn.addEventListener("click", () => {
            initAudioEngine();
            if (synthState.isPracticeRunning) {
                stopPracticeMode();
            } else {
                stopRiffPlayback();
                startPracticeMode();
            }
        });
    }

    document.querySelectorAll(".nav-section-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;
            document.querySelectorAll(".nav-section-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const el = document.getElementById(`sec-viewport-${target}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });

            if (synthState.isPracticeRunning) {
                const info = flatPracticeMap.find(m => m.section === target);
                if (info) {
                    setPracticeBar(info.absoluteBar);
                    resetNextNoteTime(audioCtx.currentTime + 0.05);
                }
            }
        });
    });
}

export function startPracticeMode() {
    if (synthState.isPracticeRunning) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    resetPracticeBar();
    synthState.isPracticeRunning = true;

    const btn = document.getElementById("practice-mode-toggle");
    if (btn) {
        btn.classList.remove("btn-accent");
        btn.classList.add("btn-secondary");
        btn.innerHTML = 'Stop Practice';
    }

    const scrollerStatus = document.getElementById("scroller-status");
    if (scrollerStatus) scrollerStatus.textContent = "Practice running...";
    lucide.createIcons();

    startMetronome();
}

export function stopPracticeMode() {
    if (!synthState.isPracticeRunning) return;
    synthState.isPracticeRunning = false;

    const btn = document.getElementById("practice-mode-toggle");
    if (btn) {
        btn.classList.remove("btn-secondary");
        btn.classList.add("btn-accent");
        btn.innerHTML = 'Start Practice';
    }

    const scrollerStatus = document.getElementById("scroller-status");
    if (scrollerStatus) scrollerStatus.textContent = "Practice stopped";
    
    const progressFill = document.getElementById("practice-progress-fill");
    if (progressFill) progressFill.style.width = "0%";

    stopMetronome();

    document.querySelectorAll(".lyrics-line").forEach(l => l.style.opacity = "1");
    document.querySelectorAll(".song-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".chord-badge").forEach(b => {
        b.classList.remove("highlighted");
        b.classList.remove("warning-transition");
    });
    document.querySelectorAll(".progression-cheat-sheet .prog-c").forEach(el => el.classList.remove("active"));

    clearActiveNeckFingers();
    lucide.createIcons();
}

export function tickPracticeProgress(pulse) {
    // Warning flash on beat 7 (last &) before chord change
    if (pulse === 6) {
        const nextIdx = currentPracticeBar;
        const curInfo = flatPracticeMap[nextIdx - 1];
        const nextInfo = flatPracticeMap[nextIdx];

        if (curInfo && nextInfo && nextInfo.chord !== curInfo.chord) {
            const sect = SONG_STRUCTURE.find(s => s.section === nextInfo.section);
            if (sect && sect.lyrics) {
                const lyr = sect.lyrics.find(l => l.bar === nextInfo.relativeBar);
                if (lyr) {
                    const badge = document.getElementById(`badge-pract-${nextInfo.section}-${nextInfo.relativeBar}`);
                    if (badge) badge.classList.add("warning-transition");
                }
            }
        }
    }

    if (pulse === 0) {
        document.querySelectorAll(".chord-badge").forEach(b => b.classList.remove("warning-transition"));

        if (currentPracticeBar >= totalPracticeBars) {
            stopPracticeMode();
            return;
        }

        const barInfo = flatPracticeMap[currentPracticeBar];

        const barLabel = document.getElementById("active-bar-label");
        if (barLabel) {
            barLabel.textContent = `Bar: ${currentPracticeBar + 1}/${totalPracticeBars} (${barInfo.sectionLabel})`;
        }

        const nextPrompt = document.getElementById("next-chord-prompt");
        const nextBarInfo = flatPracticeMap[currentPracticeBar + 1];
        if (nextPrompt) {
            if (nextBarInfo && nextBarInfo.chord !== barInfo.chord) {
                nextPrompt.textContent = `Up Next: ${CHORD_LIBRARY[nextBarInfo.chord].name}`;
            } else if (nextBarInfo) {
                nextPrompt.textContent = `Keep playing: ${CHORD_LIBRARY[barInfo.chord].name}`;
            } else {
                nextPrompt.textContent = "Finish!";
            }
        }

        const progressFill = document.getElementById("practice-progress-fill");
        if (progressFill) {
            progressFill.style.width = `${(currentPracticeBar / totalPracticeBars) * 100}%`;
        }

        // Update strum style display
        const strumTitle = document.getElementById("current-strum-style-title");
        const strumTip = document.getElementById("strumming-tip-text");
        if (strumTitle) strumTitle.textContent = barInfo.style;
        if (strumTip) strumTip.textContent = STRUM_STYLES[barInfo.style] || "";

        // Highlight active chord card
        const chordCard = document.querySelector(`.chord-item[data-chord="${barInfo.chord}"]`);
        if (chordCard) {
            document.querySelectorAll(".chord-item").forEach(c => c.classList.remove("active"));
            chordCard.classList.add("active");
            updateFretboardChord(barInfo.chord);
        }

        // Highlight progression cheat sheet
        let group = "verse";
        if (barInfo.section.includes("prechorus") || barInfo.section === "bridge") group = "prechorus";
        else if (barInfo.section.includes("chorus") || barInfo.section === "outro") group = "chorus";

        document.querySelectorAll(".progression-cheat-sheet .prog-c").forEach(el => el.classList.remove("active"));
        const groupEl = document.querySelector(`.sheet-section[data-section-group="${group}"]`);
        if (groupEl) {
            const chordEl = groupEl.querySelector(`.prog-c[data-chord-name="${barInfo.chord}"]`);
            if (chordEl) chordEl.classList.add("active");
        }

        // Highlight chord badges in lyrics
        document.querySelectorAll(".chord-badge").forEach(b => b.classList.remove("highlighted"));
        const badge = document.getElementById(`badge-pract-${barInfo.section}-${barInfo.relativeBar}`);
        if (badge) badge.classList.add("highlighted");

        // Highlight active section
        document.querySelectorAll(".song-section").forEach(s => s.classList.remove("active"));
        const secDiv = document.getElementById(`sec-viewport-${barInfo.section}`);
        if (secDiv) secDiv.classList.add("active");

        // Update nav buttons
        document.querySelectorAll(".nav-section-btn").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.target === barInfo.section);
        });

        // Scroll to active line
        if (barInfo.triggerLineId) {
            const line = document.getElementById(barInfo.triggerLineId);
            if (line) {
                document.querySelectorAll(".lyrics-line").forEach(l => l.style.opacity = "0.3");
                line.style.opacity = "1.0";
                line.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }

        incrementPracticeBar();
    }
}

export function renderPracticeBoard() {
    const sheet = document.getElementById("song-sheet-content");
    if (!sheet) return;
    sheet.innerHTML = "";

    SONG_STRUCTURE.forEach(sect => {
        const sectionDiv = document.createElement("div");
        sectionDiv.className = "song-section";
        sectionDiv.id = `sec-viewport-${sect.section}`;
        sectionDiv.innerHTML = `<h5 class="section-title">${sect.label}</h5>`;

        if (sect.text) {
            const instrDiv = document.createElement("div");
            instrDiv.className = "lyrics-line instrumental";
            instrDiv.id = `line-${sect.section}-instr`;
            instrDiv.textContent = sect.text;
            sectionDiv.appendChild(instrDiv);
        }

        if (sect.lyrics) {
            sect.lyrics.forEach(lyr => {
                const lineDiv = document.createElement("div");
                lineDiv.className = "lyrics-line";
                lineDiv.id = `line-${sect.section}-${lyr.bar}`;

                lyr.line.forEach(group => {
                    const groupSpan = document.createElement("span");
                    groupSpan.className = "lyric-chord-group";

                    if (group.c) {
                        const chordKey = group.c.toLowerCase();
                        const tooltipSVG = buildChordSVG(chordKey);
                        const groupBar = group.bar !== undefined ? group.bar : lyr.bar;

                        groupSpan.innerHTML = `
                            <span class="chord-badge" id="badge-pract-${sect.section}-${groupBar}" data-chord="${chordKey}">${group.c}</span>
                            <span class="lyric-text">${group.t}</span>
                            <div class="chord-tooltip">
                                <div class="tooltip-title">${group.c} Chord</div>
                                <div class="tooltip-svg">${tooltipSVG}</div>
                            </div>
                        `;

                        groupSpan.querySelector(".chord-badge").addEventListener("click", e => {
                            e.stopPropagation();
                            initAudioEngine();
                            if (synthState.soundEnabled) playStrummedChord(chordKey);
                        });
                    } else {
                        groupSpan.innerHTML = `<span class="lyric-text">${group.t}</span>`;
                    }

                    lineDiv.appendChild(groupSpan);
                });

                sectionDiv.appendChild(lineDiv);
            });
        }

        sheet.appendChild(sectionDiv);
    });
}
