"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthEmailForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = new URL("/auth/callback", window.location.origin);
      redirectUrl.searchParams.set("next", nextPath);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl.toString(),
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-white">Email address</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-brand-cyan"
          required
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending" || email.trim().length === 0}
        className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-cyan to-brand-violet px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending sign-in link..." : "Email me a sign-in link"}
      </button>

      <p className="text-sm leading-7 text-slate-600">
        VisaPilot uses Supabase email authentication so your applications, tracking references, and purchases stay tied to a real account instead of a query-string user ID.
      </p>

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}