import { initAudioEngine, pluckString } from "./audio.js";
import { synthState, CAPO_PITCHES } from "./state.js";
import { updateFretboardPluck, clearActiveNeckFingers } from "./fretboard.js";

export function setupTunerUI() {
    document.querySelectorAll(".tuner-string").forEach(btn => {
        btn.addEventListener("click", () => {
            initAudioEngine();
            const stringNum = parseInt(btn.dataset.string);

            // Highlight circular string tuner UI button
            document.querySelectorAll(".tuner-string").forEach(b => b.classList.remove("playing"));
            btn.classList.add("playing");

            // Play string pitch
            const frequency = CAPO_PITCHES[stringNum].freq;
            if (synthState.soundEnabled) {
                pluckString(frequency, 0, 2.5, 0.65);
                updateFretboardPluck(stringNum, 0, "open");
            }

            // Strum vibration effect duration
            setTimeout(() => {
                btn.classList.remove("playing");
                clearActiveNeckFingers();
            }, 2500);
        });
    });
}
