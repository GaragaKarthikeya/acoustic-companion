import { synthState, CHORD_LIBRARY, getFretFrequency } from "./state.js";
import { triggerStringFlash, updateFretboardChord } from "./fretboard.js";

export let audioCtx = null;
export let masterGain = null;
let reverbGain = null;
let reverbDelay = null;

// Initialize the web audio engine (on user interaction)
export function initAudioEngine() {
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

// Play single note using physics-based decay
export function pluckString(frequency, delaySeconds = 0, duration = 2.0, volume = 0.5) {
    if (!audioCtx) return;

    // Physics-based decay calculation (representing 4.5 half-lives of a real steel-string acoustic guitar)
    const alpha = 0.359 + 0.00111 * frequency;
    const computedDuration = Math.max(duration, 3.119 / alpha);

    const sampleRate = audioCtx.sampleRate;
    const periodSamples = Math.round(sampleRate / frequency);
    const bufferLength = Math.ceil(sampleRate * computedDuration);

    const buffer = audioCtx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);

    // Seed with shaped noise burst (not pure white noise — more realistic)
    for (let i = 0; i < periodSamples; i++) {
        const noise = Math.random() * 2 - 1;
        const sine = Math.sin(2 * Math.PI * i / periodSamples);
        Reflect.set(data, i, noise * 0.7 + sine * 0.3);
    }

    // Karplus-Strong with physics-aligned feedback decay
    const brightnessFactor = Math.min(1.0, frequency / 600);
    const decay = 0.9982 - brightnessFactor * 0.0012; 
    const blend = 0.48 + brightnessFactor * 0.04;    // Slight detuning for warmth

    for (let i = periodSamples; i < bufferLength; i++) {
        const p0 = Reflect.get(data, i - periodSamples);
        const p1 = Reflect.get(data, i - periodSamples + 1) || p0;
        const p2 = (i - periodSamples - 1 >= 0) ? Reflect.get(data, i - periodSamples - 1) : 0;

        const avg = p2 * 0.1 + p0 * blend + p1 * (1 - blend - 0.1);
        Reflect.set(data, i, decay * avg);
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Body resonance filter
    const bodyFilter = audioCtx.createBiquadFilter();
    bodyFilter.type = "peaking";
    bodyFilter.frequency.value = 200;
    bodyFilter.Q.value = 1.5;
    bodyFilter.gain.value = 4;

    // Brightness control
    const brightFilter = audioCtx.createBiquadFilter();
    brightFilter.type = "highshelf";
    brightFilter.frequency.value = 3000;
    brightFilter.gain.value = 2;

    // Low-cut
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

// Play chord Strum
export function playStrummedChord(chordKey, duration = 2.2, volume = 0.45) {
    if (!audioCtx) return;

    // Security check: Validate the input key is an own property of CHORD_LIBRARY
    if (typeof chordKey !== 'string' || !Object.prototype.hasOwnProperty.call(CHORD_LIBRARY, chordKey)) {
        return;
    }
    const chord = Reflect.get(CHORD_LIBRARY, chordKey);
    if (!chord) return;

    updateFretboardChord(chordKey);

    const strumDelay = 0.035;
    chord.audioNotes.forEach((note, idx) => {
        const freq = getFretFrequency(note.string, note.fret);
        pluckString(freq, idx * strumDelay, duration, volume);
    });
}

// Metronome clicking pulse sound
export function playBeatClick(pulseIndex, time) {
    if (!synthState.soundEnabled || !audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    if (pulseIndex === 0) {
        osc.frequency.setValueAtTime(1050, time);
        gain.gain.setValueAtTime(0.55, time);
    } else if (pulseIndex === 3 || pulseIndex === 7) {
        osc.frequency.setValueAtTime(750, time);
        gain.gain.setValueAtTime(0.35, time);
    } else {
        osc.frequency.setValueAtTime(450, time);
        gain.gain.setValueAtTime(0.18, time);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);
    osc.start(time);
    osc.stop(time + 0.08);
}
