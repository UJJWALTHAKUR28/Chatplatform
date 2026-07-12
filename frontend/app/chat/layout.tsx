"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignalMeter from "@/components/ui/Signalmeter";
import { useViewportHeight } from "@/lib/useViewportHeight";
const SHELL_HEIGHT_STYLE = { height: "var(--app-height, 100dvh)" };

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useViewportHeight();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-[var(--bg)]"
        style={SHELL_HEIGHT_STYLE}
      >
        <SignalMeter size="lg" color="var(--accent)" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex overflow-hidden bg-[var(--bg)]" style={SHELL_HEIGHT_STYLE}>
      {children}
    </div>
  );
}