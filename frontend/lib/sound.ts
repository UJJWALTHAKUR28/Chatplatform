"use client";
// lib/sound.ts — tiny notification-sound engine.
//
// Sounds are synthesized with the Web Audio API instead of played from an
// audio file, so there's nothing to fetch and nothing that can 404. Mute
// preference is remembered across visits.

const MUTE_KEY = "chat:sound-muted";
let sharedCtx: AudioContext | null = null;

type AudioCtor = typeof AudioContext;
function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!sharedCtx) {
        const Ctor: AudioCtor | undefined =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
        if (!Ctor) return null;
        sharedCtx = new Ctor();
    }
    return sharedCtx;
}

/** Call this on the first click/keydown in the app to satisfy browser
 *  autoplay policies, so later notification sounds aren't silently blocked. */
export function unlockAudio() {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => { });
}

export function isSoundMuted(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
        return false;
    }
}

export function setSoundMuted(muted: boolean) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
        /* ignore */
    }
    window.dispatchEvent(new CustomEvent("chat:sound-mute-changed", { detail: muted }));
}

function playTone(
    ctx: AudioContext,
    freq: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine"
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
}

/** Warm two-note chime for an incoming message. */
export function playIncomingChime() {
    if (isSoundMuted()) return;
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => { });
    const now = ctx.currentTime;
    playTone(ctx, 740, now, 0.1, 0.16);
    playTone(ctx, 1108, now + 0.075, 0.15, 0.13);
}

/** Very short, quiet tick for a message you just sent. */
export function playSentTick() {
    if (isSoundMuted()) return;
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => { });
    playTone(ctx, 520, ctx.currentTime, 0.055, 0.09);
}