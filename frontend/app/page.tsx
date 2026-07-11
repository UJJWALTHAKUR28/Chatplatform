"use client";
// app/page.tsx
//
// Behavior:
//  - While auth state is resolving: quiet splash.
//  - Signed in: redirect straight to /chat (no need to sell them on it).
//  - Signed out: show the landing page instead of bouncing to /login.

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Palette, Search, Radio, Zap, ArrowRight } from "lucide-react";
import EmberMark from "@/components/ui/Embermark";
import SignalMeter from "@/components/ui/Signalmeter";
import ThemeToggle from "@/components/ui/Themetoggle";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant delivery",
    body: "Messages arrive the moment they're sent over a live connection — no refreshing, no delay.",
  },
  {
    icon: Radio,
    title: "Presence you can trust",
    body: "See who's online and when they're typing, in real time, without asking.",
  },
  {
    icon: Search,
    title: "Find people fast",
    body: "Search by name or email and start a conversation in two taps.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Switch between a light and dark theme any time — it remembers your choice.",
  },
];

function ChatMockup() {
  return (
    <div
      className="rise-in relative w-full max-w-sm -rotate-2 rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 shadow-[var(--shadow-card)] sm:p-5"
      style={{ animationDelay: "120ms" }}
    >
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--border)] pb-3">
        <div className="relative">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wine)] text-xs font-bold text-white">
            MA
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent-bright)] ring-2 ring-[var(--bg-raised)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Maya</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Online</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-[var(--surface)] px-3.5 py-2 text-[13px] text-[var(--text-primary)]">
            Hey — did the designs come through?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-br-md bg-[var(--accent)] px-3.5 py-2 text-[13px] text-white">
            Just landed, take a look
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-[var(--surface)] px-3.5 py-2 text-[13px] text-[var(--text-primary)]">
            On it 👀
          </div>
        </div>
        <div className="flex items-center gap-2 pl-1 pt-1">
          <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-3 py-2">
            <SignalMeter size="xs" color="var(--text-tertiary)" label="Maya is typing" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <EmberMark className="h-4 w-4" />
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg italic">Ember</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-14 px-6 pb-24 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="rise-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
            <SignalMeter size="xs" color="var(--accent-bright)" bars={3} />
            Live · real-time messaging
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-5xl italic leading-[1.08] text-[var(--text-primary)] sm:text-6xl">
            Say it the moment
            <br />
            you think it.
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
            Ember is a chat app built around one idea: conversation should
            feel live. Typing shows up as it happens, presence is always
            accurate, and nothing makes you wait.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ChatMockup />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-20">
        <h2 className="max-w-md font-[family-name:var(--font-display)] text-3xl italic text-[var(--text-primary)]">
          What you get
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-start gap-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-raised)] p-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl italic text-[var(--text-primary)]">
              Ready when you are.
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Create an account in under a minute — no card, no waiting.
            </p>
          </div>
          <Link
            href="/signup"
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)]"
          >
            Create your account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-[var(--border)] px-6 py-8 text-xs text-[var(--text-tertiary)]">
        <div className="flex items-center gap-2">
          <EmberMark className="h-3.5 w-3.5" />
          <span>Ember</span>
        </div>
        <span>© {new Date().getFullYear()} Ember. Built for real conversations.</span>
      </footer>
    </div>
  );
}

export default function RootPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/chat");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-white">
            <EmberMark className="h-6 w-6" />
          </span>
          <SignalMeter size="md" color="var(--accent)" />
        </div>
      </div>
    );
  }

  return <Landing />;
}