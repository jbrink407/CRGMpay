"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isCloudConfigured, getSupabase } from "@/lib/supabase";
import { cn } from "cn";
import { ChevronDown, LogIn, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export function AuthBar({
  onSessionChange,
}: {
  onSessionChange: (session: Session | null) => void;
}) {
  const configured = isCloudConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const onSessionChangeRef = useRef(onSessionChange);
  onSessionChangeRef.current = onSessionChange;

  useEffect(() => {
    if (!configured) {
      onSessionChangeRef.current(null);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      onSessionChangeRef.current(null);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      onSessionChangeRef.current(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      onSessionChangeRef.current(next);
      if (next) {
        setOpen(false);
        setCode("");
        setError(null);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function sendCode(resend = false) {
    const supabase = getSupabase();
    const trimmed = email.trim().toLowerCase();
    if (!supabase) return;
    if (!trimmed.includes("@")) {
      setError("Enter a real email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
        // If a leftover magic-link template still has a button, land on a
        // page that tells you to type the code in the Home Screen app.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setEmail(trimmed);
    setSent(true);
    setCooldown(30);
    if (resend) setCode("");
  }

  async function verifyCode(token: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    const trimmed = token.replace(/\s/g, "");
    if (trimmed.length < 6 || trimmed.length > 8) {
      setError("Enter the code from the email (6 or 8 digits).");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: trimmed,
      type: "email",
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setOpen(false);
    setCode("");
  }

  async function signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (!configured) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          onClick={() => setOpen(true)}
        >
          <LogIn />
          Sign in
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign in is not connected yet</DialogTitle>
              <DialogDescription>
                Weeks still save on this device. To sync a phone and a laptop,
                create a free Supabase project, run <code>supabase/schema.sql</code>,
                and set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — details are in the
                README. After a redeploy, this button emails a sign-in code.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const address = session?.user.email ?? "";

  return (
    <>
      {session ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "max-md:h-11 max-w-full min-w-0",
            )}
          >
            <UserRound />
            <span className="max-w-[11rem] truncate">{address}</span>
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="font-normal">
              Signed in. Weeks sync to this account.
            </DropdownMenuLabel>
            <DropdownMenuItem className="max-md:h-11" onClick={() => void signOut()}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="max-md:h-11"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          <LogIn />
          Sign in
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
            setBusy(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to CR Pay</DialogTitle>
            <DialogDescription>
              Use your work email. We send a sign-in code — no password. Type
              it here and stay in this app. Do not tap a login link in the
              email: that opens a separate browser, not the Home Screen
              shortcut.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (sent) void verifyCode(code);
              else void sendCode();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="crpay-email">Email</Label>
              <Input
                id="crpay-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSent(false);
                }}
                disabled={busy}
              />
            </div>
            {sent ? (
              <div className="grid gap-1.5">
                <Label htmlFor="crpay-otp">Code from email</Label>
                <Input
                  id="crpay-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="00000000"
                  value={code}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 8);
                    setCode(next);
                    if (next.length === 8) void verifyCode(next);
                  }}
                  disabled={busy}
                />
                <p className="text-xs text-muted-foreground">
                  Sent to {email}. Type the whole code here (8 digits on
                  this project). Ignore any Log in button in the mail — it
                  will not sign in this app.
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {sent ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy || cooldown > 0}
                  onClick={() => void sendCode(true)}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={busy}>
                {busy
                  ? sent
                    ? "Checking…"
                    : "Sending…"
                  : sent
                    ? "Sign in"
                    : "Email me a code"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
