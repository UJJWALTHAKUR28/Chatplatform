"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundMuted, setSoundMuted, unlockAudio } from "@/lib/sound";

export default function SoundToggle({ className = "" }: { className?: string }) {
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        setMuted(isSoundMuted());
        const handler = (e: Event) => setMuted(Boolean((e as CustomEvent<boolean>).detail));
        window.addEventListener("chat:sound-mute-changed", handler);
        return () => window.removeEventListener("chat:sound-mute-changed", handler);
    }, []);

    return (
        <button
            type="button"
            onClick={() => {
                unlockAudio();
                const next = !muted;
                setSoundMuted(next);
                setMuted(next);
            }}
            title={muted ? "Unmute notification sounds" : "Mute notification sounds"}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] ${className}`}
        >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
    );
}