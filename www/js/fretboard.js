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

    // Expanded viewBox: 450 wide × 110 tall, upscaled for high legibility
    let svg = `<svg class="fretboard-svg" viewBox="0 0 450 110">`;

    // Neck background (expanded height to 80px)
    svg += `<rect x="0" y="8" width="450" height="80" class="neck-wood"/>`;

    // Nut (stretched bone nut)
    svg += `<rect x="0" y="8" width="16" height="80" class="headstock-nut"/>`;
    svg += `<rect x="14" y="8" width="3" height="80" class="nut-bar"/>`;

    // Fret positions (exponential spacing, 7 frets only, stretched frets)
    const fretX = [16];
    let prevX = 16;
    let spacing = 62;
    for (let f = 1; f <= 7; f++) {
        const x = prevX + spacing;
        fretX.push(x);
        svg += `<line x1="${x}" y1="8" x2="${x}" y2="88" class="fret-wire"/>`;
        prevX = x;
        spacing *= 0.91;
    }

    // Marker dots (frets 3, 5, 7) - scaled up and centered at y=48
    [3, 5, 7].forEach(f => {
        if (f <= 7) {
            const cx = (fretX[f - 1] + fretX[f]) / 2;
            svg += `<circle cx="${cx}" cy="48" r="5" class="marker-dot"/>`;
        }
    });

    // Fret numbers - moved to y=104 and scaled to font-size=11
    for (let f = 1; f <= 7; f++) {
        const xText = (fretX[f - 1] + fretX[f]) / 2;
        svg += `<text x="${xText}" y="104" font-size="11" font-weight="800" fill="var(--text-secondary)" text-anchor="middle">${f}</text>`;
    }

    // 6 strings — String 1 (high e) at TOP (y=15), String 6 (low E) at BOTTOM (y=81)
    // Thickness is increased for highly visible Plain Steel vs. Wound Bronze visual distinction
    for (let s = 1; s <= 6; s++) {
        const y = 15 + (s - 1) * 13.2;
        const thickness = 1.0 + (s - 1) * 0.45; 
        svg += `<line x1="16" y1="${y}" x2="450" y2="${y}" class="string-wire" id="fret-string-wire-${s}" stroke-width="${thickness}"/>`;
    }

    // Active finger dots - expanded circle radius to 9.5 and text font-size to 11
    activeNeckFingers.forEach(finger => {
        const y = 15 + (finger.string - 1) * 13.2;
        let x;
        if (finger.fret > 0 && finger.fret <= 7) {
            x = (fretX[finger.fret - 1] + fretX[finger.fret]) / 2;
        } else if (finger.fret === 0) {
            x = 8;
        } else {
            return; // Skip frets beyond display
        }

        svg += `<g class="fretboard-finger-group">`;
        svg += `<circle cx="${x}" cy="${y}" r="9.5" class="fretboard-finger-dot"/>`;
        svg += `<text x="${x}" y="${y + 3.5}" font-size="11" font-weight="800" fill="#000" text-anchor="middle">${finger.label || ""}</text>`;
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
