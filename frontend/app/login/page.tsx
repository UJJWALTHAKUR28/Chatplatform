"use client";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import EmberMark from "@/components/ui/Embermark";
import SignalMeter from "@/components/ui/Signalmeter";

// Flatten DRF validation error payloads into a single human-readable string.
type DrfErrorData = Record<string, string | string[]>;

function parseDrfError(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: DrfErrorData } })?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === "string") return data.detail;
  const messages: string[] = [];
  for (const value of Object.values(data)) {
    const errors = Array.isArray(value) ? value : [value];
    for (const msg of errors) messages.push(String(msg));
  }
  return messages.length > 0 ? messages.join("\n") : fallback;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(parseDrfError(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link
            href="/"
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-sm"
          >
            <EmberMark className="h-6 w-6" />
          </Link>
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-display)] text-2xl italic text-[var(--text-primary)]">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Sign in to your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-8 shadow-[var(--shadow-card)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="whitespace-pre-line rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                spellCheck={false}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                  spellCheck={false}
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <SignalMeter size="xs" color="white" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}