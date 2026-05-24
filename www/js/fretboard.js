import { CHORD_LIBRARY, getFretFrequency, freqToMidiNum } from "./state.js";

export let activeNeckFingers = [];

export function clearActiveNeckFingers() {
    activeNeckFingers = [];
    drawFretboard();
}

export function drawFretboard() {
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

export function triggerStringFlash(frequency) {
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

export function updateFretboardChord(chordKey) {
    const chord = CHORD_LIBRARY[chordKey];
    if (!chord) return;

    activeNeckFingers = [];
    chord.strings.forEach((fretVal, strIdx) => {
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

export function updateFretboardPluck(stringNum, fretVal, fingerLabel = "") {
    activeNeckFingers = [{
        string: stringNum,
        fret: fretVal,
        label: fingerLabel
    }];
    drawFretboard();
}
