// components/ui/EmberMark.tsx
// The app's logomark: a source point with two radiating arcs — a signal
// travelling outward. Stands in for the generic "message bubble" icon
// everyone else uses, and echoes the SignalMeter motif used throughout.

interface Props {
    className?: string;
}

export default function EmberMark({ className = "h-5 w-5" }: Props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            className={className}
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
        >
            <circle cx="7.5" cy="16.5" r="2.15" fill="currentColor" stroke="none" />
            <path d="M11.3 12.7c1.6-1.6 1.6-4.1 0-5.7" strokeLinejoin="round" />
            <path d="M14.6 16c3.2-3.2 3.2-8.3 0-11.5" strokeLinejoin="round" />
        </svg>
    );
}