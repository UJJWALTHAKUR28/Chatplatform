"use client";
// Chat shell layout — sidebar (conversation list) + main panel (thread)
// Guards: redirects to /login if not authenticated

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SignalMeter from "@/components/ui/Signalmeter";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <SignalMeter size="lg" color="var(--accent)" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <div className="flex h-screen overflow-hidden bg-[var(--bg)]">{children}</div>;
}