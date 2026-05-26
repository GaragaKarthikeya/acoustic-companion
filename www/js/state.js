// ─── Global Audio & UI State ──────────────────────────────────────────────────
export const synthState = {
    initialized: false,
    soundEnabled: true,
    speedMultiplier: 1.0,
    bpm: 108,
    isMetronomeRunning: false,
    isRiffPlaying: false,
    isPracticeRunning: false
};

// Capo 2nd Fret open-string frequencies
export const CAPO_PITCHES = {
    6: { note: "F#2", freq: 92.50 },
    5: { note: "B2",  freq: 123.47 },
    4: { note: "E3",  freq: 164.81 },
    3: { note: "A3",  freq: 220.00 },
    2: { note: "C#4", freq: 277.18 },
    1: { note: "F#4", freq: 369.99 }
};

export const SEMITONE_RATIO = Math.pow(2, 1 / 12);

export function getFretFrequency(stringNum, fretNum) {
    return CAPO_PITCHES[stringNum].freq * Math.pow(SEMITONE_RATIO, fretNum);
}

export function freqToMidiNum(freq) {
    return Math.round(12 * Math.log2(freq / 440) + 69);
}

// ─── Guitar Chord Fingerings Database ─────────────────────────────────────────
export const CHORD_LIBRARY = {
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

// ─── Strum Patterns Description Constants ─────────────────────────────────────
export const STRUM_STYLES = {
    "Palm Muted": "8 down-picks per bar. Accent on 2nd & 4th 'and' beats. Heavy palm muting at bridge.",
    "Open Build": "8 down-picks per bar. Gradually release palm muting to build up volume for the Chorus!",
    "Open Strum": "Loud, full down-strums without palm muting. Accent strongly on 2 and 4 to sound massive!"
};

// ─── Complete Full Unabridged Song Structure Database ───────────────────────
export const SONG_STRUCTURE = [
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
        { bar: 0, line: [ { c: "C", t: "Lovin' can hurt", bar: 0 } ] },
        { bar: 2, line: [ { c: "", t: "Lovin' can hurt " }, { c: "Am", t: "sometimes", bar: 2 } ] },
        { bar: 4, line: [ { c: "G", t: "But it's the only thing that I ", bar: 4 }, { c: "F", t: "know", bar: 6 } ] },
        { bar: 8, line: [ { c: "C", t: "And when it gets hard", bar: 8 } ] },
        { bar: 10, line: [ { c: "", t: "You know it can get hard " }, { c: "Am", t: "sometimes", bar: 10 } ] },
        { bar: 12, line: [ { c: "G", t: "It is the only thing that makes us feel ", bar: 12 }, { c: "F", t: "alive", bar: 14 } ] }
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
        { bar: 0, line: [ { c: "Am", t: "We keep this love in a ", bar: 0 }, { c: "F", t: "photograph", bar: 1 } ] },
        { bar: 2, line: [ { c: "C", t: "We made these memories ", bar: 2 }, { c: "G", t: "for ourselves", bar: 3 } ] },
        { bar: 4, line: [ { c: "Am", t: "Where our eyes are never closin', ", bar: 4 }, { c: "F", t: "Hearts are never broken", bar: 5 } ] },
        { bar: 6, line: [ { c: "C", t: "And time's forever ", bar: 6 }, { c: "G", t: "frozen still", bar: 7 } ] }
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
        { bar: 0, line: [ { c: "C", t: "So you can keep me", bar: 0 } ] },
        { bar: 2, line: [ { c: "G", t: "Inside the pocket of your ripped jeans", bar: 2 } ] },
        { bar: 4, line: [ { c: "Am", t: "Holdin' me closer 'til ", bar: 4 }, { c: "F", t: "our eyes meet", bar: 6 } ] },
        { bar: 8, line: [ { c: "C", t: "You won't ever ", bar: 8 }, { c: "G", t: "be alone", bar: 10 } ] },
        { bar: 12, line: [ { c: "Am", t: "Wait for me to ", bar: 12 }, { c: "F", t: "come home", bar: 14 } ] }
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
        { bar: 0, line: [ { c: "C", t: "Lovin' can heal", bar: 0 } ] },
        { bar: 2, line: [ { c: "Am", t: "Lovin' can mend your soul", bar: 2 } ] },
        { bar: 4, line: [ { c: "G", t: "And it's the only thing that I ", bar: 4 }, { c: "F", t: "know, know", bar: 6 } ] },
        { bar: 8, line: [ { c: "C", t: "I swear it will get easier", bar: 8 } ] },
        { bar: 10, line: [ { c: "", t: "Remember that with " }, { c: "Am", t: "every piece of ya", bar: 10 } ] },
        { bar: 12, line: [ { c: "G", t: "Mm, and it's the only thing we take with us ", bar: 12 }, { c: "F", t: "when we die", bar: 14 } ] }
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
        { bar: 0, line: [ { c: "Am", t: "Mm, we keep this love in this ", bar: 0 }, { c: "F", t: "photograph", bar: 1 } ] },
        { bar: 2, line: [ { c: "C", t: "We made these memories ", bar: 2 }, { c: "G", t: "for ourselves", bar: 3 } ] },
        { bar: 4, line: [ { c: "Am", t: "Where our eyes are never closin', ", bar: 4 }, { c: "F", t: "Hearts were never broken", bar: 5 } ] },
        { bar: 6, line: [ { c: "C", t: "And time's forever ", bar: 6 }, { c: "G", t: "frozen still", bar: 7 } ] }
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
        { bar: 0, line: [ { c: "C", t: "So you can keep me", bar: 0 } ] },
        { bar: 2, line: [ { c: "G", t: "Inside the pocket of your ripped jeans", bar: 2 } ] },
        { bar: 4, line: [ { c: "Am", t: "Holdin' me closer 'til ", bar: 4 }, { c: "F", t: "our eyes meet", bar: 6 } ] },
        { bar: 8, line: [ { c: "C", t: "You won't ever ", bar: 8 }, { c: "G", t: "be alone", bar: 10 } ] },
        { bar: 12, line: [ { c: "Am", t: "And if you hurt me, well ", bar: 12 }, { c: "F", t: "that's okay baby", bar: 14 } ] },
        { bar: 16, line: [ { c: "C", t: "Only words bleed, inside ", bar: 16 }, { c: "G", t: "these pages", bar: 18 } ] },
        { bar: 20, line: [ { c: "Am", t: "You just hold me, and I won't ", bar: 20 }, { c: "F", t: "ever let you go", bar: 22 } ] },
        { bar: 20, line: [ { c: "Am", t: "Wait for me to ", bar: 20 }, { c: "F", t: "come home", bar: 22 } ] }
    ]},

    // 8. BRIDGE
    { section: "bridge", label: "Bridge", barCount: 8, chords: [
        { bar: 0, chord: "am", style: "Palm Muted" },
        { bar: 2, chord: "f", style: "Palm Muted" },
        { bar: 4, chord: "c", style: "Palm Muted" },
        { bar: 6, chord: "g", style: "Open Build" }
    ], lyrics: [
        { bar: 0, line: [ { c: "Am", t: "Wait for me to come ", bar: 0 }, { c: "F", t: "home", bar: 2 } ] },
        { bar: 4, line: [ { c: "C", t: "Wait for me to come ", bar: 4 }, { c: "G", t: "home [Build Up!]", bar: 6 } ] }
    ]},

    // 9. CHORUS 3
    { section: "chorus3", label: "Chorus 3", barCount: 24, chords: [
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
        { bar: 0, line: [ { c: "C", t: "Oh, you can fit me", bar: 0 } ] },
        { bar: 2, line: [ { c: "G", t: "Inside that necklace you got when you were sixteen", bar: 2 } ] },
        { bar: 4, line: [ { c: "Am", t: "Next to your heartbeat, where ", bar: 4 }, { c: "F", t: "I should be", bar: 6 } ] },
        { bar: 8, line: [ { c: "C", t: "Keep it deep within ", bar: 8 }, { c: "G", t: "your soul", bar: 10 } ] },
        { bar: 12, line: [ { c: "Am", t: "And if you hurt me, well ", bar: 12 }, { c: "F", t: "that's okay baby", bar: 14 } ] },
        { bar: 16, line: [ { c: "C", t: "Only words bleed, inside ", bar: 16 }, { c: "G", t: "these pages", bar: 18 } ] },
        { bar: 20, line: [ { c: "Am", t: "You just hold me, and I won't ", bar: 20 }, { c: "F", t: "ever let you go", bar: 22 } ] }
    ]},

    // 10. OUTRO
    { section: "outro", label: "Outro", barCount: 10, chords: [
        { bar: 0, chord: "c", style: "Palm Muted" },
        { bar: 1, chord: "am", style: "Palm Muted" },
        { bar: 2, chord: "g", style: "Palm Muted" },
        { bar: 3, chord: "f", style: "Palm Muted" },
        { bar: 4, chord: "c", style: "Palm Muted" },
        { bar: 5, chord: "am", style: "Palm Muted" },
        { bar: 6, chord: "g", style: "Palm Muted" },
        { bar: 7, chord: "f", style: "Palm Muted" },
        { bar: 8, chord: "c", style: "Palm Muted" }
    ], lyrics: [
        { bar: 0, line: [ { c: "C", t: "When I'm away, I will remember how you ", bar: 0 }, { c: "Am", t: "kissed me", bar: 1 } ] },
        { bar: 2, line: [ { c: "G", t: "Under the lamppost back on ", bar: 2 }, { c: "F", t: "Sixth Street", bar: 3 } ] },
        { bar: 4, line: [ { c: "C", t: "Hearin' you whisper through the ", bar: 4 }, { c: "Am", t: "phone", bar: 5 } ] },
        { bar: 6, line: [ { c: "G", t: "\"Wait for me to come ", bar: 6 }, { c: "F", t: "home\"", bar: 7 } ] },
        { bar: 8, line: [ { c: "C", t: "[Hold C string ring to finish]", bar: 8 } ] }
    ]}
];

export let flatPracticeMap = [];
export let totalPracticeBars = 0;
export let currentPracticeBar = 0;

export function compilePracticeMap() {
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
                let activeLyr = null;
                for (let i = 0; i < sect.lyrics.length; i++) {
                    if (sect.lyrics[i].bar <= b) {
                        activeLyr = sect.lyrics[i];
                    } else {
                        break;
                    }
                }
                if (activeLyr) {
                    lineId = `line-${sect.section}-${activeLyr.bar}`;
                }
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

export function incrementPracticeBar() {
    currentPracticeBar++;
}

export function resetPracticeBar() {
    currentPracticeBar = 0;
}

export function setPracticeBar(val) {
    currentPracticeBar = val;
}
