"use client";

/**
 * /profile — User profile page.
 *
 * Lets the authenticated user view their account info, update their
 * display_name (must be unique across all accounts), and set app
 * preferences (theme, notification sound).
 *
 * PATCH /api/v1/auth/me/ is called on form submission.
 * On success, the AuthContext's cached user object is updated in-place
 * so the sidebar reflects the new name immediately.
 */

import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Edit3, User, X } from "lucide-react";
import Link from "next/link";
import type { User as UserType } from "@/types";
import { avatarGradient } from "@/lib/avatarColors";
import SignalMeter from "@/components/ui/Signalmeter";
import ThemeToggle from "@/components/ui/Themetoggle";
import SoundToggle from "@/components/ui/SoundToggle";

// ── Avatar (initials circle) ─────────────────────────────────────────────────
function Avatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = name.slice(0, 2).toUpperCase();
  const [from, to] = avatarGradient(name);
  const dim = size === "lg" ? "h-24 w-24 text-2xl" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${dim}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {initials}
    </div>
  );
}

// ── Field display row ────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateUser, isLoading } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) setDisplayName(user.display_name);
  }, [user]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed === user.display_name) {
      setEditing(false);
      return;
    }
    if (trimmed.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.patch<UserType>("/auth/me/", {
        display_name: trimmed,
      });
      updateUser({ display_name: res.data.display_name });
      setDisplayName(res.data.display_name);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { display_name?: string[]; detail?: string } };
      };
      const detail =
        axiosErr.response?.data?.display_name?.[0] ??
        axiosErr.response?.data?.detail ??
        "Failed to update display name. Please try again.";
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.display_name ?? "");
    setEditing(false);
    setError(null);
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg)]">
        <SignalMeter size="lg" color="var(--accent)" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)]">
      <div className="mx-auto max-w-lg px-4 py-10">
        {/* Back link */}
        <Link
          href="/chat"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] p-8 shadow-[var(--shadow-card)]">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Avatar name={user.display_name} size="lg" />
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-xl italic text-[var(--text-primary)]">
                {user.display_name}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{user.email}</p>
            </div>
          </div>

          {/* Success toast */}
          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent)]">
              <Check className="h-4 w-4 flex-shrink-0" />
              Display name updated.
            </div>
          )}

          {/* Profile fields */}
          <div className="space-y-6">
            {/* Display name (editable) */}
            <SectionCard>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
                  Display name
                </p>
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    id="edit-display-name-btn"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      id="save-display-name-btn"
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {saving ? <SignalMeter size="xs" color="white" bars={3} /> : <Check className="h-3 w-3" />}
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <div>
                  <input
                    ref={inputRef}
                    id="display-name-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    maxLength={50}
                    placeholder="Your display name"
                    className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-raised)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  />
                  <div className="mt-1.5 flex justify-between font-[family-name:var(--font-mono)]">
                    {error ? (
                      <p className="text-xs text-[var(--danger)]">{error}</p>
                    ) : (
                      <p className="text-xs text-[var(--text-tertiary)]">Must be unique. 2–50 characters.</p>
                    )}
                    <p className="text-xs text-[var(--text-tertiary)]">{displayName.length}/50</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-semibold text-[var(--text-primary)]">{user.display_name}</p>
              )}
            </SectionCard>

            {/* Email (read-only) */}
            <SectionCard>
              <InfoRow label="Email address" value={user.email ?? "—"} />
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                Email is your login identifier and cannot be changed.
              </p>
            </SectionCard>

            {/* Joined date */}
            <SectionCard>
              <InfoRow
                label="Member since"
                value={
                  user.date_joined
                    ? new Date(user.date_joined).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                    : "—"
                }
              />
            </SectionCard>

            {/* Preferences */}
            <SectionCard>
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
                Preferences
              </p>
              <div className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Appearance</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Light or dark theme</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] py-1.5 pt-4">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Notification sound</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Play a chime for new messages</p>
                </div>
                <SoundToggle />
              </div>
            </SectionCard>
          </div>

          {/* Account footer */}
          <div className="mt-8 flex items-center justify-center gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--text-tertiary)]">
            <User className="h-3.5 w-3.5" />
            <span>Account ID: {user.id.slice(0, 8)}…</span>
          </div>
        </div>
      </div>
    </div>
  );
}