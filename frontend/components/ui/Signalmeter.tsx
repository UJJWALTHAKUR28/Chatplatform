"use client";
// components/ui/SignalMeter.tsx
//
// The app's one recurring signature element: a small live equalizer.
// Used in place of generic spinning-circle loaders (a page is "coming
// through") and in place of bouncing-dot typing indicators (someone's
// signal is live right now). Same motif, same meaning, everywhere.

interface Props {
    size?: "xs" | "sm" | "md" | "lg";
    color?: string;
    bars?: number;
    label?: string;
    className?: string;
}

const SIZES: Record<string, { height: number; width: number; gap: number }> = {
    xs: { height: 10, width: 2, gap: 2 },
    sm: { height: 14, width: 2.5, gap: 2.5 },
    md: { height: 22, width: 3, gap: 3.5 },
    lg: { height: 32, width: 4, gap: 4.5 },
};

export default function SignalMeter({
    size = "sm",
    color = "currentColor",
    bars = 4,
    label = "Loading",
    className = "",
}: Props) {
    const { height, width, gap } = SIZES[size];
    const indices = Array.from({ length: bars }, (_, i) => i);

    return (
        <span
            className={`inline-flex items-end ${className}`}
            style={{ height, gap }}
            role="status"
            aria-label={label}
        >
            {indices.map((i) => (
                <span
                    key={i}
                    className="signal-bar inline-block"
                    style={{
                        width,
                        background: color,
                        animationDelay: `${i * 0.12}s`,
                    }}
                />
            ))}
        </span>
    );
}