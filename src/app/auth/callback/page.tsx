"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import Link from "next/link";

export default function AuthCallbackPage() {
  return (
    <main className="min-h-full bg-[#ece7de] px-4 py-10 text-[#1c1915]">
      <div className="mx-auto max-w-md rounded-xl bg-[#f7f3ea] p-4 shadow-sm ring-1 ring-[#1c1915]/10">
        <p className="text-[11px] font-medium tracking-[0.18em] text-[#e35756] uppercase">
          CR Pay
        </p>
        <h1 className="mt-2 font-heading text-lg">Use the code in the app</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6f675c]">
          This email link opened a normal browser. The Home Screen shortcut is a
          different app and will not see this login.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#6f675c]">
          Close this tab, tap the CR Pay icon, and type the 6-digit code from
          the email into Sign in. Keep that screen open while you copy the code.
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-4")}>
          Back to the sheet
        </Link>
      </div>
    </main>
  );
}
