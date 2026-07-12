"use client";
// app/page.tsx
//
// Behavior:
//  - While auth state is resolving: quiet splash.
//  - Signed in: redirect straight to /chat (no need to sell them on it).
//  - Signed out: show the landing page instead of bouncing to /login.


import { useState } from "react";
import Link from "next/link";
import {
  Palette,
  Search,
  Radio,
  Zap,
  ArrowRight,
  UserPlus,
  MessageCircle,
  RefreshCw,
  Lock,
  ShieldCheck,
  KeyRound,
  ChevronDown,
} from "lucide-react";
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

const HOW_IT_WORKS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create your account",
    body: "Just an email and a display name — no card, no waiting around.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find your people",
    body: "Search by name or email and jump into a conversation in two taps.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Talk in real time",
    body: "Messages, typing, and presence update instantly over a live connection.",
  },
  {
    icon: RefreshCw,
    step: "04",
    title: "Stay in sync",
    body: "Read state and unread counts follow you, so you never lose the thread.",
  },
];

const SECURITY_POINTS = [
  {
    icon: Lock,
    title: "Encrypted at rest",
    body: "Every message is encrypted before it ever touches the database — a raw data dump reveals nothing about what was said.",
  },
  {
    icon: KeyRound,
    title: "Short-lived sessions",
    body: "Access tokens expire in minutes. Refresh tokens rotate on use and are revoked the moment you log out.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Conversations are scoped strictly to their participants, enforced on every request and every socket connection.",
  },
];

const TECH_STACK = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Django",
  "Django Channels",
  "PostgreSQL",
  "Redis",
  "WebSockets",
  "JWT Auth",
];

const FAQS = [
  {
    question: "Is Ember free to use?",
    answer: "Yes. Creating an account and messaging your contacts doesn't cost anything.",
  },
  {
    question: "Are my messages private?",
    answer:
      "Messages are encrypted at rest and only ever visible to the people inside that conversation.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Ember runs right in your mobile browser — no app store or install required.",
  },
  {
    question: "Can I switch between light and dark mode?",
    answer: "Anytime, from the toggle in the navbar. Your choice is remembered for next time.",
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

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-20">
      <h2 className="max-w-md font-[family-name:var(--font-display)] text-3xl italic text-[var(--text-primary)]">
        How it works
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        Four steps between you and your next conversation.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map(({ icon: Icon, step, title, body }) => (
          <div
            key={step}
            className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-6"
          >
            <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--text-tertiary)]">
              {step}
            </span>
            <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)]">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-20">
      <div className="max-w-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-bright)]" />
          Privacy &amp; security
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--text-primary)]">
          Built to protect your conversations.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Speed shouldn&apos;t come at the cost of privacy. Ember is built with
          both in mind from the ground up.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {SECURITY_POINTS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechStackSection() {
  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-20">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <h2 className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--text-primary)]">
            What&apos;s under the hood
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            A real-time stack chosen for one job: getting a message from one
            screen to another without anyone noticing the trip.
          </p>
        </div>
        <SignalMeter size="sm" color="var(--accent-bright)" bars={4} />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        {TECH_STACK.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            {tech}
          </span>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-20">
      <h2 className="max-w-md font-[family-name:var(--font-display)] text-3xl italic text-[var(--text-primary)]">
        Questions, answered
      </h2>

      <div className="mt-8 max-w-2xl divide-y divide-[var(--border)] border-t border-[var(--border)]">
        {FAQS.map(({ question, answer }, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={question}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {question}
                </span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)] transition-transform ${isOpen ? "rotate-180" : ""
                    }`}
                />
              </button>
              {isOpen && (
                <p className="pb-5 pr-8 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}


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

      {/* How it works */}
      <HowItWorks />

      {/* Security */}
      <SecuritySection />

      {/* Tech stack */}
      <TechStackSection />

      {/* FAQ */}
      <FAQSection />

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
  return <Landing />;
}