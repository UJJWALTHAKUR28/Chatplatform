"use client";
// components/layout/Navbar.tsx
//
// Global top navigation bar.
//
// Rendered once in the root layout, so it's present on every route by
// default. "Home" always means the marketing landing page ("/") — that's
// true whether the person is signed in or signed out, so both the logo and
// a dedicated Home icon point there unconditionally.
//   - Signed out : logo + Home icon → "/"  + "Log in" + "Sign up"
//   - Signed in  : logo + Home icon → "/"  + Profile + Sign out icons
//
// The /chat section already ships its own header (conversation-list panel
// has the logo, its own Home icon, and sign-out; the thread panel has its
// own back control) so this bar intentionally steps aside there — a second
// header stacked on top would just eat vertical space in an already tight
// two-pane layout.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, MessageSquare, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EmberMark from "@/components/ui/Embermark";
import ThemeToggle from "@/components/ui/Themetoggle";

export default function Navbar() {
    const pathname = usePathname();
    const { isAuthenticated, isLoading, logout } = useAuth();

    if (pathname?.startsWith("/chat")) return null;

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-raised)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-raised)]/70">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
                <Link href="/" className="flex items-center gap-2 text-[var(--text-primary)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                        <EmberMark className="h-4 w-4" />
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-lg italic">Ember</span>
                </Link>

                <div className="flex items-center gap-1.5">
                    <Link
                        href="/"
                        title="Home"
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    >
                        <Home className="h-4 w-4" />
                    </Link>

                    <ThemeToggle className="mr-1" />

                    {isLoading ? null : isAuthenticated ? (
                        <>
                            {/* Primary CTA for logged-in users */}
                            <Link
                                href="/chat"
                                className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]"
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span>Open Chat</span>
                            </Link>
                            <Link
                                href="/profile"
                                title="Profile"
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                            >
                                <UserIcon className="h-4 w-4" />
                            </Link>
                            <button
                                type="button"
                                onClick={logout}
                                title="Sign out"
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="rounded-xl px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/signup"
                                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]"
                            >
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}