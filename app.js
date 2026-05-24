/* ==========================================================================
   Photograph Guitar Learning Dashboard — Complete JS Rewrite
   ASUS TUF Gaming A15 FHD 1920×1080
   Audio: Improved Karplus-Strong synthesis (PRIMARY, no external samples)
   ========================================================================== */

// ─── 1. Audio Engine State ──────────────────────────────────────────────────
let audioCtx = null;
let masterGain = null;
let reverbGain = null;
let reverbDelay = null;

const synthState = {
    initialized: false,
    soundEnabled: true,
    speedMultiplier: 1.0,
    bpm: 108,
    isMetronomeRunning: false,
    isRiffPlaying: false,
    isPracticeRunning: false
};

// Capo 2nd Fret open-string frequencies
const CAPO_PITCHES = {
    6: { note: "F#2", freq: 92.50 },
    5: { note: "B2",  freq: 123.47 },
    4: { note: "E3",  freq: 164.81 },
    3: { note: "A3",  freq: 220.00 },
    2: { note: "C#4", freq: 277.18 },
    1: { note: "F#4", freq: 369.99 }
};

const SEMITONE_RATIO = Math.pow(2, 1 / 12);

function getFretFrequency(stringNum, fretNum) {
    return CAPO_PITCHES[stringNum].freq * Math.pow(SEMITONE_RATIO, fretNum);
}

function freqToMidiNum(freq) {
    return Math.round(12 * Math.log2(freq / 440) + 69);
}

// ─── 2. Audio Engine Init ───────────────────────────────────────────────────
function initAudioEngine() {
    if (synthState.initialized) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // Feedback delay reverb (simple but effective)
    reverbDelay = audioCtx.createDelay();
    reverbDelay.delayTime.value = 0.12;

    reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.18;

    // Reverb send chain: masterGain → delay → reverbGain → destination
    const reverbSend = audioCtx.createGain();
    reverbSend.gain.value = 0.25;

    masterGain.connect(reverbSend);
    reverbSend.connect(reverbDelay);
    reverbDelay.connect(reverbGain);
    reverbGain.connect(reverbDelay); // feedback loop
    reverbGain.connect(audioCtx.destination);

    synthState.initialized = true;

    // Update status
    const statusEl = document.getElementById("audio-loading-status");
    if (statusEl) {
        statusEl.textContent = "Synth Engine Active";
        statusEl.style.color = "var(--color-green)";
    }
}

// ─── 3. Improved Karplus-Strong Synthesis ────────────────────────────────────
function pluckString(frequency, delaySeconds = 0, duration = 2.0, volume = 0.5) {
    if (!audioCtx) return;

    // Physics-based decay calculation (representing 4.5 half-lives of a real steel-string acoustic guitar)
    // Damping alpha = A_air + B_internal * frequency
    const alpha = 0.359 + 0.00111 * frequency;
    const computedDuration = Math.max(duration, 3.119 / alpha); // 4.5 half-lives baseline

    const sampleRate = audioCtx.sampleRate;
    const periodSamples = Math.round(sampleRate / frequency);
    const bufferLength = Math.ceil(sampleRate * computedDuration);

    const buffer = audioCtx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);

    // Seed with shaped noise burst (not pure white noise — more realistic)
    for (let i = 0; i < periodSamples; i++) {
        // Mix of white noise and a sine component for body resonance
        const noise = Math.random() * 2 - 1;
        const sine = Math.sin(2 * Math.PI * i / periodSamples);
        data[i] = noise * 0.7 + sine * 0.3;
    }

    // Karplus-Strong with improved averaging and physics-aligned feedback decay
    const brightnessFactor = Math.min(1.0, frequency / 600);
    // Align KS loop decay to allow the calculated physical sustain without premature damping
    const decay = 0.9982 - brightnessFactor * 0.0012; 
    const blend = 0.48 + brightnessFactor * 0.04;    // Slight detuning for warmth

    for (let i = periodSamples; i < bufferLength; i++) {
        const p0 = data[i - periodSamples];
        const p1 = data[i - periodSamples + 1] || data[i - periodSamples];
        const p2 = (i - periodSamples - 1 >= 0) ? data[i - periodSamples - 1] : 0;

        // 3-point weighted average for string stiffness modeling
        const avg = p2 * 0.1 + p0 * blend + p1 * (1 - blend - 0.1);
        data[i] = decay * avg;
    }

    // Create nodes
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Body resonance filter (simulates acoustic guitar body)
    const bodyFilter = audioCtx.createBiquadFilter();
    bodyFilter.type = "peaking";
    bodyFilter.frequency.value = 200; // Warm body resonance
    bodyFilter.Q.value = 1.5;
    bodyFilter.gain.value = 4;

    // Brightness control — slight high-shelf boost for attack clarity
    const brightFilter = audioCtx.createBiquadFilter();
    brightFilter.type = "highshelf";
    brightFilter.frequency.value = 3000;
    brightFilter.gain.value = 2;

    // Low-cut to remove rumble
    const hipassFilter = audioCtx.createBiquadFilter();
    hipassFilter.type = "highpass";
    hipassFilter.frequency.value = 80;
    hipassFilter.Q.value = 0.7;

    // Envelope
    const envelope = audioCtx.createGain();
    const startTime = audioCtx.currentTime + delaySeconds;
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(volume, startTime + 0.003);
    envelope.gain.setValueAtTime(volume, startTime + 0.01);
    envelope.gain.exponentialRampToValueAtTime(volume * 0.6, startTime + 0.08);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + computedDuration);

    // Connect chain: source → hipass → body → bright → envelope → master
    source.connect(hipassFilter);
    hipassFilter.connect(bodyFilter);
    bodyFilter.connect(brightFilter);
    brightFilter.connect(envelope);
    envelope.connect(masterGain);

    source.start(startTime);
    source.stop(startTime + computedDuration);

    // Trigger visual feedback
    setTimeout(() => {
        triggerStringFlash(frequency);
    }, delaySeconds * 1000);
}

// ─── 4. Fretboard Visualizer (Compact SVG: 450×55, 7 frets) ────────────────
let activeNeckFingers = [];

function drawFretboard() {
    const container = document.getElementById("fretboard-neck");
    if (!container) return;
    container.innerHTML = "";

    // Compact viewBox: 450 wide × 55 tall, only 7 frets
    let svg = `<svg class="fretboard-svg" viewBox="0 0 450 55">`;

    // Neck background
    svg += `<rect x="0" y="4" width="450" height="42" class="neck-wood"/>`;

    // Nut
    svg += `<rect x="0" y="4" width="16" height="42" class="headstock-nut"/>`;
    svg += `<rect x="14" y="4" width="3" height="42" class="nut-bar"/>`;

    // Fret positions (exponential spacing, 7 frets only)
    const fretX = [16];
    let prevX = 16;
    let spacing = 62;
    for (let f = 1; f <= 7; f++) {
        const x = prevX + spacing;
        fretX.push(x);
        svg += `<line x1="${x}" y1="4" x2="${x}" y2="46" class="fret-wire"/>`;
        prevX = x;
        spacing *= 0.91;
    }

    // Marker dots (frets 3, 5, 7)
    [3, 5, 7].forEach(f => {
        if (f <= 7) {
            const cx = (fretX[f - 1] + fretX[f]) / 2;
            svg += `<circle cx="${cx}" cy="25" r="3" class="marker-dot"/>`;
        }
    });

    // Fret numbers
    for (let f = 1; f <= 7; f++) {
        const xText = (fretX[f - 1] + fretX[f]) / 2;
        svg += `<text x="${xText}" y="53" font-size="6" font-weight="800" fill="#ad9e97" text-anchor="middle">${f}</text>`;
    }

    // 6 strings — String 1 (high e) at TOP (y=9), String 6 (low E) at BOTTOM (y=41)
    for (let s = 1; s <= 6; s++) {
        const y = 9 + (s - 1) * 6.4;
        const thickness = 0.6 + (s - 1) * 0.22; // Thinner high strings, thicker low
        svg += `<line x1="16" y1="${y}" x2="450" y2="${y}" class="string-wire" id="fret-string-wire-${s}" stroke-width="${thickness}"/>`;
    }

    // Active finger dots
    activeNeckFingers.forEach(finger => {
        const y = 9 + (finger.string - 1) * 6.4;
        let x;
        if (finger.fret > 0 && finger.fret <= 7) {
            x = (fretX[finger.fret - 1] + fretX[finger.fret]) / 2;
        } else if (finger.fret === 0) {
            x = 8;
        } else {
            return; // Skip frets beyond display
        }

        svg += `<g class="fretboard-finger-group">`;
        svg += `<circle cx="${x}" cy="${y}" r="4.5" class="fretboard-finger-dot"/>`;
        svg += `<text x="${x}" y="${y + 2}" font-size="6" font-weight="800" fill="#000" text-anchor="middle">${finger.label || ""}</text>`;
        svg += `</g>`;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

function triggerStringFlash(frequency) {
    const targetMidi = freqToMidiNum(frequency);

    let closestString = 1;
    let minDiff = 100;
    for (let s = 1; s <= 6; s++) {
        for (let f = 0; f <= 7; f++) {
            const m = freqToMidiNum(getFretFrequency(s, f));
            const diff = Math.abs(m - targetMidi);
            if (diff < minDiff) {
                minDiff = diff;
                closestString = s;
            }
        }
    }

    const wire = document.getElementById(`fret-string-wire-${closestString}`);
    if (wire) {
        wire.classList.add("strummed");
        setTimeout(() => wire.classList.remove("strummed"), 150);
    }
}

function updateFretboardChord(chordKey) {
    const chord = CHORD_LIBRARY[chordKey];
    if (!chord) return;

    activeNeckFingers = [];
    chord.strings.forEach((fretVal, strIdx) => {
        const stringNum = strIdx + 1; // strings array is indexed 0-5 for strings 1-6
        // Wait — in the CHORD_LIBRARY, strings[0] = string 6 (low E), strings[5] = string 1 (high e)
        // Actually looking at the data: c.strings = ["X", 3, 2, 0, 1, 0] which is [6th, 5th, 4th, 3rd, 2nd, 1st]
        // So strings[0] = string 6, strings[5] = string 1
        const sNum = 6 - strIdx;
        if (fretVal !== "X" && fretVal !== "x" && fretVal > 0) {
            activeNeckFingers.push({
                string: sNum,
                fret: fretVal,
                label: chord.fingers[strIdx] || ""
            });
        }
    });

    drawFretboard();
}

function updateFretboardPluck(stringNum, fretVal, fingerLabel = "") {
    activeNeckFingers = [{
        string: stringNum,
        fret: fretVal,
        label: fingerLabel
    }];
    drawFretboard();
}

// ─── 5. Chord Library ───────────────────────────────────────────────────────
const CHORD_LIBRARY = {
    c: {
        name: "C Major",
        subtitle: "The Root Chord",
        strings: ["X", 3, 2, 0, 1, 0], // E A D G B e
        fingers: ["", 3, 2, "", 1, ""],
        audioNotes: [
            { string: 5, fret: 3 },
            { string: 4, fret: 2 },
            { string: 3, fret: 0 },
            { string: 2, fret: 1 },
            { string: 1, fret: 0 }
        ]
    },
    am: {
        name: "A Minor",
        subtitle: "The Sad Verse Beat",
        strings: ["X", 0, 2, 2, 1, 0],
        fingers: ["", "", 2, 3, 1, ""],
        audioNotes: [
            { string: 5, fret: 0 },
            { string: 4, fret: 2 },
            { string: 3, fret: 2 },
            { string: 2, fret: 1 },
            { string: 1, fret: 0 }
        ]
    },
    g: {
        name: "G Major",
        subtitle: "Bright Acoustic Core",
        strings: [3, 2, 0, 0, 3, 3],
        fingers: [2, 1, "", "", 3, 4],
        audioNotes: [
            { string: 6, fret: 3 },
            { string: 5, fret: 2 },
            { string: 4, fret: 0 },
            { string: 3, fret: 0 },
            { string: 2, fret: 3 },
            { string: 1, fret: 3 }
        ]
    },
    f: {
        name: "F Major",
        subtitle: "Thumb Bar Chord",
        strings: [1, 3, 3, 2, 1, 1],
        fingers: ["T", 3, 4, 2, 1, 1],
        audioNotes: [
            { string: 6, fret: 1 },
            { string: 5, fret: 3 },
            { string: 4, fret: 3 },
            { string: 3, fret: 2 },
            { string: 2, fret: 1 },
            { string: 1, fret: 1 }
        ]
    },
    fmaj7: {
        name: "Fmaj7",
        subtitle: "Beginner substitute",
        strings: ["X", "X", 3, 2, 1, 0],
        fingers: ["", "", 3, 2, 1, ""],
        audioNotes: [
            { string: 4, fret: 3 },
            { string: 3, fret: 2 },
            { string: 2, fret: 1 },
            { string: 1, fret: 0 }
        ]
    }
};

function playStrummedChord(chordKey, duration = 2.2, volume = 0.45) {
    if (!audioCtx) return;
    const chord = CHORD_LIBRARY[chordKey];
    if (!chord) return;

    updateFretboardChord(chordKey);

    const strumDelay = 0.035;
    chord.audioNotes.forEach((note, idx) => {
        const freq = getFretFrequency(note.string, note.fret);
        pluckString(freq, idx * strumDelay, duration, volume);
    });
}

function renderChordLibrary() {
    const container = document.getElementById("chords-library-container");
    if (!container) return;
    container.innerHTML = "";

    Object.keys(CHORD_LIBRARY).forEach(key => {
        const chord = CHORD_LIBRARY[key];
        const card = document.createElement("div");
        card.className = "chord-item";
        card.dataset.chord = key;

        card.innerHTML = `
            <span class="chord-name">${chord.name}</span>
            ${buildChordSVG(key)}
            <span class="badge-label" style="font-size:0.45rem;text-align:center;">${chord.subtitle}</span>
        `;

        card.addEventListener("click", () => {
            document.querySelectorAll(".chord-item").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            initAudioEngine();
            if (synthState.soundEnabled) playStrummedChord(key);
        });

        container.appendChild(card);
    });
}

function buildChordSVG(chordKey) {
    const chord = CHORD_LIBRARY[chordKey];
    if (!chord) return "";

    let svg = `<svg class="chord-diagram-svg" viewBox="0 0 100 110">
        <line x1="20" y1="20" x2="20" y2="95" class="string-line" stroke-width="1.2"/>
        <line x1="34" y1="20" x2="34" y2="95" class="string-line" stroke-width="1.0"/>
        <line x1="48" y1="20" x2="48" y2="95" class="string-line" stroke-width="0.85"/>
        <line x1="62" y1="20" x2="62" y2="95" class="string-line" stroke-width="0.75"/>
        <line x1="76" y1="20" x2="76" y2="95" class="string-line" stroke-width="0.65"/>
        <line x1="90" y1="20" x2="90" y2="95" class="string-line" stroke-width="0.55"/>
        <line x1="19" y1="20" x2="91" y2="20" class="nut-line"/>
        <line x1="19" y1="38" x2="91" y2="38" class="fret-line" stroke-width="0.8"/>
        <line x1="19" y1="57" x2="91" y2="57" class="fret-line" stroke-width="0.8"/>
        <line x1="19" y1="76" x2="91" y2="76" class="fret-line" stroke-width="0.8"/>
        <line x1="19" y1="95" x2="91" y2="95" class="fret-line" stroke-width="0.8"/>
        <text x="8" y="32" font-size="8" font-weight="700" fill="#6e615a">I</text>
        <text x="8" y="51" font-size="8" font-weight="700" fill="#6e615a">II</text>
        <text x="8" y="70" font-size="8" font-weight="700" fill="#6e615a">III</text>
        <text x="8" y="89" font-size="8" font-weight="700" fill="#6e615a">IV</text>
    `;

    chord.strings.forEach((val, i) => {
        const x = 20 + i * 14;
        if (val === "X" || val === "x") {
            svg += `<text x="${x}" y="12" class="muted-string">×</text>`;
        } else if (val === 0) {
            svg += `<text x="${x}" y="12" class="open-string">○</text>`;
        }
    });

    chord.strings.forEach((fretVal, i) => {
        if (fretVal !== "X" && fretVal !== "x" && fretVal > 0) {
            const x = 20 + i * 14;
            const y = 20 + fretVal * 19 - 9.5;
            svg += `<circle cx="${x}" cy="${y}" r="5.5" class="finger-dot"/>`;
            svg += `<text x="${x}" y="${y + 2.8}" class="finger-text">${chord.fingers[i] || ""}</text>`;
        }
    });

    svg += `</svg>`;
    return svg;
}

// ─── 6. Metronome ───────────────────────────────────────────────────────────
let nextNoteTime = 0.0;
let currentPulse = 0;
let schedulerTimer = null;
const LOOKAHEAD = 25.0;
const SCHEDULE_WINDOW = 50.0;

function playBeatClick(pulseIndex, time) {
    if (!synthState.soundEnabled || !audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    if (pulseIndex === 0) {
        osc.frequency.setValueAtTime(1050, time);
        gain.gain.setValueAtTime(0.55, time); // was 0.16
    } else if (pulseIndex === 3 || pulseIndex === 7) {
        osc.frequency.setValueAtTime(750, time);
        gain.gain.setValueAtTime(0.35, time); // was 0.09
    } else {
        osc.frequency.setValueAtTime(450, time);
        gain.gain.setValueAtTime(0.18, time); // was 0.04
    }

    // Fuller and longer click sustain to carry more energy
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
    osc.start(time);
    osc.stop(time + 0.08);
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

function renderBeatGrid() {
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

function visualFlashBeat(pulse) {
    document.querySelectorAll(".beat-pad").forEach(p => p.classList.remove("active"));
    const pad = document.getElementById(`beat-pad-${pulse}`);
    if (pad) pad.classList.add("active");

    if (synthState.isPracticeRunning) tickPracticeProgress(pulse);
}

function setupMetronomeUI() {
    const toggleBtn = document.getElementById("metronome-toggle");
    const bpmSlider = document.getElementById("bpm-slider");
    const bpmVal = document.getElementById("bpm-val");
    const soundBtn = document.getElementById("metro-sound-toggle");
    const tapBtn = document.getElementById("tap-tempo-btn");

    toggleBtn.addEventListener("click", () => {
        initAudioEngine();
        synthState.isMetronomeRunning ? stopMetronome() : startMetronome();
    });

    bpmSlider.addEventListener("input", e => {
        synthState.bpm = parseInt(e.target.value);
        bpmVal.textContent = synthState.bpm;
    });

    soundBtn.addEventListener("click", () => {
        synthState.soundEnabled = !synthState.soundEnabled;
        soundBtn.classList.toggle("active", synthState.soundEnabled);
        soundBtn.innerHTML = synthState.soundEnabled
            ? '<i data-lucide="volume-2"></i>'
            : '<i data-lucide="volume-x"></i>';
        lucide.createIcons();
    });

    let tapTimes = [];
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
            bpmSlider.value = bpm;
            bpmVal.textContent = bpm;
        }
    });
}

function startMetronome() {
    if (synthState.isMetronomeRunning) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    nextNoteTime = audioCtx.currentTime + 0.05;
    currentPulse = 0;
    synthState.isMetronomeRunning = true;

    const icon = document.getElementById("metro-play-icon");
    icon.setAttribute("data-lucide", "pause");
    lucide.createIcons();

    metronomeScheduler();
}

function stopMetronome() {
    if (!synthState.isMetronomeRunning) return;
    clearTimeout(schedulerTimer);
    synthState.isMetronomeRunning = false;

    const icon = document.getElementById("metro-play-icon");
    icon.setAttribute("data-lucide", "play");
    lucide.createIcons();

    document.querySelectorAll(".beat-pad").forEach(p => p.classList.remove("active"));
}

// ─── 7. Riff Tab Player ─────────────────────────────────────────────────────
const RIFF_SEQUENCE = [
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

function renderRiffTab() {
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
    cursor.style.left = "14px";
    container.appendChild(cursor);

    wrapper.appendChild(container);
}

let riffTimeout = null;
let currentRiffIndex = 0;

function startRiffPlayback() {
    if (synthState.isRiffPlaying) return;
    initAudioEngine();
    if (audioCtx.state === "suspended") audioCtx.resume();

    synthState.isRiffPlaying = true;
    currentRiffIndex = 0;

    const btn = document.getElementById("riff-play-btn");
    btn.innerHTML = '<i data-lucide="square"></i> Stop';
    lucide.createIcons();

    const cursor = document.getElementById("tab-playback-cursor");
    if (cursor) cursor.style.display = "block";

    playNextRiffNote();
}

function stopRiffPlayback() {
    if (!synthState.isRiffPlaying) return;
    clearTimeout(riffTimeout);
    synthState.isRiffPlaying = false;

    const btn = document.getElementById("riff-play-btn");
    btn.innerHTML = '<i data-lucide="play"></i> Play Riff';
    lucide.createIcons();

    const cursor = document.getElementById("tab-playback-cursor");
    if (cursor) cursor.style.display = "none";
    document.querySelectorAll(".tab-note-char").forEach(c => c.classList.remove("playing"));

    activeNeckFingers = [];
    drawFretboard();
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
            cursor.style.left = `${14 + (currentRiffIndex * 3 + 1) * 6.5}px`;
        }
    }

    const eighthMs = 0.5 * (60000 / synthState.bpm);
    const delay = (eighthMs * note.len) / synthState.speedMultiplier;
    currentRiffIndex++;
    riffTimeout = setTimeout(playNextRiffNote, delay);
}

function setupRiffUI() {
    const btn = document.getElementById("riff-play-btn");
    btn.addEventListener("click", () => {
        if (synthState.isRiffPlaying) {
            stopRiffPlayback();
        } else {
            stopMetronome();
            stopPracticeMode();
            startRiffPlayback();
        }
    });

    document.querySelectorAll(".speed-selector button").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".speed-selector button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            synthState.speedMultiplier = parseFloat(btn.dataset.speed);
        });
    });
}

// ─── 8. Tuner ───────────────────────────────────────────────────────────────
function setupTunerUI() {
    document.querySelectorAll(".tuner-string").forEach(btn => {
        btn.addEventListener("click", () => {
            initAudioEngine();
            if (audioCtx.state === "suspended") audioCtx.resume();

            const stringIdx = parseInt(btn.dataset.string);
            const pitchInfo = CAPO_PITCHES[stringIdx];

            document.querySelectorAll(".tuner-string").forEach(b => b.classList.remove("playing"));
            btn.classList.add("playing");

            pluckString(pitchInfo.freq, 0, 2.5, 0.85);
            updateFretboardPluck(stringIdx, 0, "○");

            setTimeout(() => {
                btn.classList.remove("playing");
                activeNeckFingers = [];
                drawFretboard();
            }, 2500);
        });
    });
}

// ─── 9. Song Structure & Practice Engine ────────────────────────────────────
const SONG_STRUCTURE = [
    // 1. INTRO
    { section: "intro", label: "Intro", barCount: 8, chords: [
        { bar: 0, chord: "c", style: "Palm Muted" },
        { bar: 2, chord: "am", style: "Palm Muted" },
        { bar: 4, chord: "g", style: "Palm Muted" },
        { bar: 6, chord: "f", style: "Palm Muted" }
    ], text: "[Instrumental Guitar Intro - C | Am | G | F]" },

    // 2. VERSE 1
    { section: "verse1", label: "Verse 1", barCount: 16, chords: [
        { bar: 0, chord: "c", style: "Palm Muted" },
        { bar: 2, chord: "am", style: "Palm Muted" },
        { bar: 4, chord: "g", style: "Palm Muted" },
        { bar: 6, chord: "f", style: "Palm Muted" },
        { bar: 8, chord: "c", style: "Palm Muted" },
        { bar: 10, chord: "am", style: "Palm Muted" },
        { bar: 12, chord: "g", style: "Palm Muted" },
        { bar: 14, chord: "f", style: "Palm Muted" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "Lovin' can hurt" } ] },
        { bar: 2, line: [ { c: "", t: "Lovin' can hurt " }, { c: "Am", t: "sometimes" } ] },
        { bar: 4, line: [ { c: "G", t: "But it's the only thing that I " }, { c: "F", t: "know" } ] },
        { bar: 8, line: [ { c: "C", t: "And when it gets hard" } ] },
        { bar: 10, line: [ { c: "", t: "You know it can get hard " }, { c: "Am", t: "sometimes" } ] },
        { bar: 12, line: [ { c: "G", t: "It is the only thing that makes us feel " }, { c: "F", t: "alive" } ] }
    ]},

    // 3. PRE-CHORUS 1
    { section: "prechorus1", label: "Pre-Chor 1", barCount: 8, chords: [
        { bar: 0, chord: "am", style: "Open Build" },
        { bar: 1, chord: "f", style: "Open Build" },
        { bar: 2, chord: "c", style: "Open Build" },
        { bar: 3, chord: "g", style: "Open Build" },
        { bar: 4, chord: "am", style: "Open Build" },
        { bar: 5, chord: "f", style: "Open Build" },
        { bar: 6, chord: "c", style: "Open Build" },
        { bar: 7, chord: "g", style: "Open Build" }
    ], lyrics: [
        { bar: 0, line: [ { c: "Am", t: "We keep this love in a " }, { c: "F", t: "photograph" } ] },
        { bar: 2, line: [ { c: "C", t: "We made these memories " }, { c: "G", t: "for ourselves" } ] },
        { bar: 4, line: [ { c: "Am", t: "Where our eyes are never closin', " }, { c: "F", t: "Hearts are never broken" } ] },
        { bar: 6, line: [ { c: "C", t: "And time's forever " }, { c: "G", t: "frozen still" } ] }
    ]},

    // 4. CHORUS 1
    { section: "chorus1", label: "Chorus 1", barCount: 16, chords: [
        { bar: 0, chord: "c", style: "Open Strum" },
        { bar: 2, chord: "g", style: "Open Strum" },
        { bar: 4, chord: "am", style: "Open Strum" },
        { bar: 6, chord: "f", style: "Open Strum" },
        { bar: 8, chord: "c", style: "Open Strum" },
        { bar: 10, chord: "g", style: "Open Strum" },
        { bar: 12, chord: "am", style: "Open Strum" },
        { bar: 14, chord: "f", style: "Open Strum" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "So you can keep me" } ] },
        { bar: 2, line: [ { c: "G", t: "Inside the pocket of your ripped jeans" } ] },
        { bar: 4, line: [ { c: "Am", t: "Holdin' me closer 'til " }, { c: "F", t: "our eyes meet" } ] },
        { bar: 8, line: [ { c: "C", t: "You won't ever " }, { c: "G", t: "be alone" } ] },
        { bar: 12, line: [ { c: "Am", t: "Wait for me to " }, { c: "F", t: "come home" } ] }
    ]},

    // 5. VERSE 2
    { section: "verse2", label: "Verse 2", barCount: 16, chords: [
        { bar: 0, chord: "c", style: "Palm Muted" },
        { bar: 2, chord: "am", style: "Palm Muted" },
        { bar: 4, chord: "g", style: "Palm Muted" },
        { bar: 6, chord: "f", style: "Palm Muted" },
        { bar: 8, chord: "c", style: "Palm Muted" },
        { bar: 10, chord: "am", style: "Palm Muted" },
        { bar: 12, chord: "g", style: "Palm Muted" },
        { bar: 14, chord: "f", style: "Palm Muted" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "Lovin' can heal" } ] },
        { bar: 2, line: [ { c: "Am", t: "Lovin' can mend your soul" } ] },
        { bar: 4, line: [ { c: "G", t: "And it's the only thing that I " }, { c: "F", t: "know, know" } ] },
        { bar: 8, line: [ { c: "C", t: "I swear it will get easier" } ] },
        { bar: 10, line: [ { c: "", t: "Remember that with " }, { c: "Am", t: "every piece of ya" } ] },
        { bar: 12, line: [ { c: "G", t: "Mm, and it's the only thing we take with us " }, { c: "F", t: "when we die" } ] }
    ]},

    // 6. PRE-CHORUS 2
    { section: "prechorus2", label: "Pre-Chor 2", barCount: 8, chords: [
        { bar: 0, chord: "am", style: "Open Build" },
        { bar: 1, chord: "f", style: "Open Build" },
        { bar: 2, chord: "c", style: "Open Build" },
        { bar: 3, chord: "g", style: "Open Build" },
        { bar: 4, chord: "am", style: "Open Build" },
        { bar: 5, chord: "f", style: "Open Build" },
        { bar: 6, chord: "c", style: "Open Build" },
        { bar: 7, chord: "g", style: "Open Build" }
    ], lyrics: [
        { bar: 0, line: [ { c: "Am", t: "Mm, we keep this love in this " }, { c: "F", t: "photograph" } ] },
        { bar: 2, line: [ { c: "C", t: "We made these memories " }, { c: "G", t: "for ourselves" } ] },
        { bar: 4, line: [ { c: "Am", t: "Where our eyes are never closin', " }, { c: "F", t: "Hearts were never broken" } ] },
        { bar: 6, line: [ { c: "C", t: "And time's forever " }, { c: "G", t: "frozen still" } ] }
    ]},

    // 7. CHORUS 2
    { section: "chorus2", label: "Chorus 2", barCount: 24, chords: [
        { bar: 0, chord: "c", style: "Open Strum" },
        { bar: 2, chord: "g", style: "Open Strum" },
        { bar: 4, chord: "am", style: "Open Strum" },
        { bar: 6, chord: "f", style: "Open Strum" },
        { bar: 8, chord: "c", style: "Open Strum" },
        { bar: 10, chord: "g", style: "Open Strum" },
        { bar: 12, chord: "am", style: "Open Strum" },
        { bar: 14, chord: "f", style: "Open Strum" },
        { bar: 16, chord: "c", style: "Open Strum" },
        { bar: 18, chord: "g", style: "Open Strum" },
        { bar: 20, chord: "am", style: "Open Strum" },
        { bar: 22, chord: "f", style: "Open Strum" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "So you can keep me" } ] },
        { bar: 2, line: [ { c: "G", t: "Inside the pocket of your ripped jeans" } ] },
        { bar: 4, line: [ { c: "Am", t: "Holdin' me closer 'til " }, { c: "F", t: "our eyes meet" } ] },
        { bar: 8, line: [ { c: "C", t: "You won't ever " }, { c: "G", t: "be alone" } ] },
        { bar: 10, line: [ { c: "Am", t: "And if you hurt me, well " }, { c: "F", t: "that's okay baby" } ] },
        { bar: 12, line: [ { c: "C", t: "Only words bleed, inside " }, { c: "G", t: "these pages" } ] },
        { bar: 16, line: [ { c: "Am", t: "You just hold me, and I won't " }, { c: "F", t: "ever let you go" } ] },
        { bar: 20, line: [ { c: "C", t: "Wait for me to " }, { c: "G", t: "come home" } ] }
    ]},

    // 8. BRIDGE
    { section: "bridge", label: "Bridge", barCount: 8, chords: [
        { bar: 0, chord: "am", style: "Palm Muted" },
        { bar: 2, chord: "f", style: "Palm Muted" },
        { bar: 4, chord: "c", style: "Palm Muted" },
        { bar: 6, chord: "g", style: "Open Build" }
    ], lyrics: [
        { bar: 0, line: [ { c: "Am", t: "Wait for me to come " }, { c: "F", t: "home" } ] },
        { bar: 4, line: [ { c: "C", t: "Wait for me to come " }, { c: "G", t: "home [Build Up!]" } ] }
    ]},

    // 9. CHORUS 3
    { section: "chorus3", label: "Chorus 3", barCount: 16, chords: [
        { bar: 0, chord: "c", style: "Open Strum" },
        { bar: 2, chord: "g", style: "Open Strum" },
        { bar: 4, chord: "am", style: "Open Strum" },
        { bar: 6, chord: "f", style: "Open Strum" },
        { bar: 8, chord: "c", style: "Open Strum" },
        { bar: 10, chord: "g", style: "Open Strum" },
        { bar: 12, chord: "am", style: "Open Strum" },
        { bar: 14, chord: "f", style: "Open Strum" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "Oh, you can fit me" } ] },
        { bar: 2, line: [ { c: "G", t: "Inside that necklace you got when you were sixteen" } ] },
        { bar: 4, line: [ { c: "Am", t: "Next to your heartbeat, where " }, { c: "F", t: "I should be" } ] },
        { bar: 8, line: [ { c: "C", t: "Keep it deep within " }, { c: "G", t: "your soul" } ] },
        { bar: 10, line: [ { c: "Am", t: "And if you hurt me, well " }, { c: "F", t: "that's okay baby" } ] },
        { bar: 12, line: [ { c: "C", t: "Only words bleed, inside " }, { c: "G", t: "these pages" } ] },
        { bar: 14, line: [ { c: "Am", t: "You just hold me, and I won't " }, { c: "F", t: "ever let you go" } ] }
    ]},

    // 10. OUTRO
    { section: "outro", label: "Outro", barCount: 10, chords: [
        { bar: 0, chord: "c", style: "Palm Muted" },
        { bar: 2, chord: "am", style: "Palm Muted" },
        { bar: 4, chord: "g", style: "Palm Muted" },
        { bar: 6, chord: "f", style: "Palm Muted" },
        { bar: 8, chord: "c", style: "Palm Muted" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "When I'm away, I will remember how you " }, { c: "Am", t: "kissed me" } ] },
        { bar: 2, line: [ { c: "G", t: "Under the lamppost back on " }, { c: "F", t: "Sixth Street" } ] },
        { bar: 4, line: [ { c: "C", t: "Hearin' you whisper through the " }, { c: "Am", t: "phone" } ] },
        { bar: 6, line: [ { c: "G", t: "\"Wait for me to come " }, { c: "F", t: "home\"" } ] },
        { bar: 8, line: [ { c: "C", t: "[Hold C string ring to finish]" } ] }
    ]}
];

let flatPracticeMap = [];
let totalPracticeBars = 0;
let currentPracticeBar = 0;

function compilePracticeMap() {
    flatPracticeMap = [];
    let offset = 0;

    SONG_STRUCTURE.forEach(sect => {
        for (let b = 0; b < sect.barCount; b++) {
            let activeChord = "";
            let activeStyle = "Palm Muted";

            for (let c = sect.chords.length - 1; c >= 0; c--) {
                if (sect.chords[c].bar <= b) {
                    activeChord = sect.chords[c].chord;
                    activeStyle = sect.chords[c].style;
                    break;
                }
            }

            let lineId = "";
            if (sect.lyrics) {
                const lyr = sect.lyrics.find(l => l.bar === b);
                if (lyr) lineId = `line-${sect.section}-${b}`;
            } else if (b === 0 && sect.text) {
                lineId = `line-${sect.section}-instr`;
            }

            flatPracticeMap.push({
                absoluteBar: offset + b,
                section: sect.section,
                sectionLabel: sect.label,
                relativeBar: b,
                chord: activeChord,
                style: activeStyle,
                triggerLineId: lineId
            });
        }
        offset += sect.barCount;
    });

    totalPracticeBars = offset;
}

function renderPracticeBoard() {
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

                        groupSpan.innerHTML = `
                            <span class="chord-badge" id="badge-pract-${sect.section}-${lyr.bar}" data-chord="${chordKey}">${group.c}</span>
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

// ─── 10. Practice Mode ──────────────────────────────────────────────────────
function setupPracticeUI() {
    const btn = document.getElementById("practice-mode-toggle");

    btn.addEventListener("click", () => {
        initAudioEngine();
        if (synthState.isPracticeRunning) {
            stopPracticeMode();
        } else {
            stopRiffPlayback();
            startPracticeMode();
        }
    });

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
                    currentPracticeBar = info.absoluteBar;
                    nextNoteTime = audioCtx.currentTime + 0.05;
                }
            }
        });
    });
}

function startPracticeMode() {
    if (synthState.isPracticeRunning) return;
    if (audioCtx.state === "suspended") audioCtx.resume();

    currentPracticeBar = 0;
    synthState.isPracticeRunning = true;

    const btn = document.getElementById("practice-mode-toggle");
    btn.classList.remove("btn-accent");
    btn.classList.add("btn-secondary");
    btn.innerHTML = '<i data-lucide="square"></i> Stop Practice';

    document.getElementById("scroller-status").textContent = "Practice running...";
    lucide.createIcons();

    startMetronome();
}

function stopPracticeMode() {
    if (!synthState.isPracticeRunning) return;
    synthState.isPracticeRunning = false;

    const btn = document.getElementById("practice-mode-toggle");
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-accent");
    btn.innerHTML = '<i data-lucide="zap"></i> Start Practice';

    document.getElementById("scroller-status").textContent = "Practice stopped";
    document.getElementById("practice-progress-fill").style.width = "0%";

    stopMetronome();

    document.querySelectorAll(".lyrics-line").forEach(l => l.style.opacity = "1");
    document.querySelectorAll(".song-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".chord-badge").forEach(b => {
        b.classList.remove("highlighted");
        b.classList.remove("warning-transition");
    });
    document.querySelectorAll(".progression-cheat-sheet .prog-c").forEach(el => el.classList.remove("active"));

    activeNeckFingers = [];
    drawFretboard();
    lucide.createIcons();
}

const STRUM_STYLES = {
    "Palm Muted": "8 down-picks per bar. Accent on 2nd & 4th 'and' beats. Heavy palm muting at bridge.",
    "Open Build": "8 down-picks per bar. Gradually release palm muting to build up volume for the Chorus!",
    "Open Strum": "Loud, full down-strums without palm muting. Accent strongly on 2 and 4 to sound massive!"
};

function tickPracticeProgress(pulse) {
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

        document.getElementById("active-bar-label").textContent =
            `Bar: ${currentPracticeBar + 1}/${totalPracticeBars} (${barInfo.sectionLabel})`;

        const nextBarInfo = flatPracticeMap[currentPracticeBar + 1];
        if (nextBarInfo && nextBarInfo.chord !== barInfo.chord) {
            document.getElementById("next-chord-prompt").textContent =
                `Up Next: ${CHORD_LIBRARY[nextBarInfo.chord].name}`;
        } else if (nextBarInfo) {
            document.getElementById("next-chord-prompt").textContent =
                `Keep playing: ${CHORD_LIBRARY[barInfo.chord].name}`;
        } else {
            document.getElementById("next-chord-prompt").textContent = "Finish!";
        }

        document.getElementById("practice-progress-fill").style.width =
            `${(currentPracticeBar / totalPracticeBars) * 100}%`;

        // Update strum style display
        document.getElementById("current-strum-style-title").textContent = barInfo.style;
        document.getElementById("strumming-tip-text").textContent = STRUM_STYLES[barInfo.style] || "";

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

        currentPracticeBar++;
    }
}

// ─── 11. Init Overlay ───────────────────────────────────────────────────────
function setupInitOverlay() {
    const overlay = document.getElementById("audio-init-overlay");
    const btn = document.getElementById("btn-init-audio");

    btn.addEventListener("click", () => {
        initAudioEngine();
        if (audioCtx.state === "suspended") audioCtx.resume();
        playStrummedChord("c", 2.2, 0.45);
        overlay.classList.add("hidden");
    });
}

// ─── 12. Boot ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    drawFretboard();
    renderChordLibrary();
    renderBeatGrid();
    renderRiffTab();

    compilePracticeMap();
    renderPracticeBoard();

    setupMetronomeUI();
    setupRiffUI();
    setupTunerUI();
    setupPracticeUI();
    setupInitOverlay();
});
