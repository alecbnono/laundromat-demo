"use client";

import { useState } from "react";
import { LuCheck, LuCopy, LuMessageSquareText } from "react-icons/lu";
import { Button, buttonClass } from "@/components/ui";

/**
 * The "ready" notification. Nothing is sent by the server:
 * - Copy puts the text on the clipboard (paste into Messenger, Viber, etc.).
 * - Send SMS opens this phone's own texting app with the number and text filled in.
 */
export default function ReadyMessage({ message, phone }: { message: string; phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Clipboard API needs HTTPS; fall back for plain-http local testing.
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-2.5 rounded-[10px] border border-[#bfe3cd] bg-[#f1f9f4] p-3">
      <p className="whitespace-pre-wrap">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} className="flex-[1_1_140px]">
          {copied ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
          {copied ? "Copied" : "Copy message"}
        </Button>
        <a
          className={buttonClass({ variant: "primary", className: "flex-[1_1_140px]" })}
          href={`sms:${phone}?&body=${encodeURIComponent(message)}`}
        >
          <LuMessageSquareText aria-hidden /> Send SMS
        </a>
      </div>
      <small className="text-[0.85rem] text-muted">
        Send SMS opens your phone&apos;s texting app. You press send there.
      </small>
    </div>
  );
}
