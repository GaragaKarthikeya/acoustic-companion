import { CHORD_LIBRARY, synthState } from "./state.js";
import { playStrummedChord, initAudioEngine } from "./audio.js";

export function renderChordLibrary() {
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

export function buildChordSVG(chordKey) {
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
            const y = 20 + (fretVal - 1) * 19 + 9.5;
            svg += `<circle cx="${x}" cy="${y}" r="4.5" class="finger-dot"/>`;
            svg += `<text x="${x}" y="${y + 2.8}" class="finger-text">${chord.fingers[i] || ""}</text>`;
        }
    });

    svg += `</svg>`;
    return svg;
}
