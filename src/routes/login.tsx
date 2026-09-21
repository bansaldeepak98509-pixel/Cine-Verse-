import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { SignInGate } from "@/lib/auth/gates";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display mb-6 inline-block text-2xl tracking-tight">
          Cine<span className="text-accent">Verse</span>
        </Link>
        <h1 className="font-display text-3xl">Cloud backup</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Sign in to save your watchlist, tracker and ratings to your account. Clearing phone storage will no longer wipe them.
        </p>
        <SignInGate
          fallback={
            authEnabled ? (
              <div className="flex flex-col gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <button
                    key={p.providerId}
                    type="button"
                    onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                    className="h-12 rounded-full bg-accent text-sm font-medium text-accent-fg"
                  >
                    Continue with {p.label}
                  </button>
                ))}
                <Link to="/" className="mt-3 text-center text-sm text-muted hover:text-fg">
                  Continue without an account
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">Sign-in is disabled.</p>
            )
          }
        >
          <p className="text-sm text-ok">You are signed in.</p>
          <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-fg">
            Back to CineVerse
          </Link>
        </SignInGate>
      </div>
    </main>
  );
}
