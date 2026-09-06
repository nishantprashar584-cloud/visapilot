"use client";

import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthEmailForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sendingOtp" | "redirectingGoogle" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function buildRedirectUrl() {
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", nextPath);
    return redirectUrl.toString();
  }

  async function handleGoogleSignIn() {
    setStatus("redirectingGoogle");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildRedirectUrl(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sendingOtp");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: buildRedirectUrl(),
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatus("sent");
      setMessage("Check your inbox for the VisaPilot sign-in link.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Unable to send sign-in email.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Choose a sign-in method</p>
        <p className="text-lg font-semibold text-white">Open your secure workspace</p>
      </div>
      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={status === "sendingOtp" || status === "redirectingGoogle"}
        className="vp-btn w-full border border-white/14 bg-white px-5 text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M21.805 12.23c0-.68-.061-1.334-.174-1.962H12v3.709h5.498a4.705 4.705 0 0 1-2.039 3.087v2.564h3.302c1.934-1.782 3.044-4.408 3.044-7.398Z" fill="#4285F4" />
          <path d="M12 22c2.76 0 5.075-.915 6.761-2.472l-3.302-2.564c-.916.614-2.089.977-3.459.977-2.656 0-4.907-1.793-5.712-4.203H2.874v2.647A9.998 9.998 0 0 0 12 22Z" fill="#34A853" />
          <path d="M6.288 13.738A5.996 5.996 0 0 1 5.969 12c0-.604.109-1.19.319-1.738V7.615H2.874A9.998 9.998 0 0 0 2 12c0 1.612.385 3.136 1.074 4.385l3.214-2.647Z" fill="#FBBC05" />
          <path d="M12 6.059c1.5 0 2.847.516 3.909 1.53l2.93-2.93C17.07 3.014 14.757 2 12 2A9.998 9.998 0 0 0 3.074 7.615l3.214 2.647C7.093 7.852 9.344 6.059 12 6.059Z" fill="#EA4335" />
        </svg>
        {status === "redirectingGoogle" ? "Redirecting to Google..." : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        <span className="h-px flex-1 bg-white/10" />
        Or use email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.2rem] border border-white/10 bg-white/6 p-4">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-white">Email address</span>
          <div className="flex items-center gap-3 rounded-[1rem] border border-white/12 bg-black/15 px-4 py-3 focus-within:border-blue-300/35">
            <Mail className="h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              required
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={status === "sendingOtp" || status === "redirectingGoogle" || email.trim().length === 0}
          className="vp-btn vp-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sendingOtp" ? "Sending sign-in link..." : "Email me a sign-in link"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="vp-surface-quiet p-4 text-sm text-slate-300">
          <p className="flex items-center gap-2 font-semibold text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Account-bound workspace</p>
          <p className="mt-2 leading-6">Applications, supporting documents, and purchases stay tied to a real account.</p>
        </div>
        <div className="vp-surface-quiet p-4 text-sm text-slate-300">
          <p className="flex items-center gap-2 font-semibold text-white"><Lock className="h-4 w-4 text-cyan-300" /> Signed links only</p>
          <p className="mt-2 leading-6">Use the emailed sign-in link to return to the exact route you were trying to open.</p>
        </div>
      </div>

      {message ? <p className="rounded-[1rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-200">{message}</p> : null}
    </div>
  );
}