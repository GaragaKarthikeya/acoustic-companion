# Metronome Engine & Practice Board Synchronization

Acoustic Session features a high-precision metronome scheduler and a dynamically synchronized practice engine. This document details the lookahead scheduling system, tap tempo tracking, and the visual/audio lyrics sync loop.

---

## 1. High-Precision Lookahead Scheduler

Javascript's standard `setInterval` or `setTimeout` timers are subject to garbage collection pauses and main-thread execution delays, making them too unstable for musical metronomes. 

The application resolves this by combining lightweight scheduling intervals with the high-precision clock of the Web Audio API (`audioCtx.currentTime`):

```mermaid
flowchart TD
    Start[Start Metronome] --> ScheduleLoop{Scheduler Timer: 25ms Lookahead}
    ScheduleLoop --> Check{Is next note within 50ms window?}
    Check -- Yes -- > Schedule[Schedule playBeatClick at precise Web Audio timestamp]
    Schedule --> VisualDelay[Calculate remaining delta time]
    VisualDelay --> VisualFlash[Set setTimeout to trigger visual visualFlashBeat]
    ScheduleLoop --> Advance[Advance beat target time]
    Advance --> ScheduleLoop
```

* **The Loop**: A scheduler function runs every **25ms** (the `LOOKAHEAD` window) using a standard timeout.
* **The Window**: During each run, it checks if the next metronome click falls within the next **50ms** (the `SCHEDULE_WINDOW`).
* **Web Audio Scheduling**: If a click is due, the audio click node is scheduled to play at a precise future timestamp using Web Audio's hardware clock:
  `osc.start(scheduledTime)`
* **Visual Sync**: A standard timeout computes the exact millisecond delta to fire the visual pad flashes (`visualFlashBeat`) in sync with the audio.

---

## 2. Tap Tempo Smoothing

The Tap Tempo feature allows users to set the BPM naturally by clicking the tap button:
* **Filtering**: Tap intervals older than 2.2 seconds are discarded to reset the tap session.
* **Averaging**: The time differences between consecutive taps are recorded:
  $$\Delta t_i = t_{i} - t_{i-1}$$
* **Calculation**: The BPM is computed from the running average of these intervals:
  $$\text{BPM} = \frac{60,000}{\text{Average}(\Delta t)}$$
* **Clamping**: The output is securely clamped between **50 BPM** (slow practice) and **160 BPM** (fast strumming) to maintain engine stability.

---

## 3. Practice Board Synchronization Loop

During **Practice Mode**, the metronome serves as the master timer, driving the interactive scrolling and chord indicators on beat 1 (Pulse 0) of every bar:

1. **Section Mapping**: The entire song structure is flattened into a chronological sequence of bars (`flatPracticeMap`). Each bar contains data on the active chord, strumming style, target syllable, and HTML line anchors.
2. **Dynamic Lyric Scrolling**: As the metronome advances past Pulse 0 of a new bar, the engine locates the trigger line ID and executes a smooth DOM scroll:
  `line.scrollIntoView({ behavior: 'smooth', block: 'center' })`
3. **Chord Highlighting**: Simultaneously, the active chord card in the left library and the progression indicators in the Fretboard Visualizer are set to active.
4. **1-Beat Transition Warning**: To allow beginners to shift their hands in time, a split-second warning is triggered on **Pulse 6 (Beat 4 &)** of the preceding bar. If the upcoming bar features a chord change, the target chord badge flashes amber (`warning-transition` CSS animation).
