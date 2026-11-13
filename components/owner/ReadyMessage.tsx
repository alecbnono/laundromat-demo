"use client";

import { useState } from "react";
import { Check, Copy, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="grid gap-2.5 rounded-lg border border-success/25 bg-success-soft/50 p-3">
      <p className="whitespace-pre-wrap">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copy} className="flex-[1_1_140px]">
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy message"}
        </Button>
        <Button asChild className="flex-[1_1_140px] no-underline">
          <a href={`sms:${phone}?&body=${encodeURIComponent(message)}`}>
            <MessageSquareText data-icon="inline-start" /> Send SMS
          </a>
        </Button>
      </div>
      <small className="text-sm text-muted-foreground">
        Send SMS opens your phone&apos;s texting app. You press send there.
      </small>
    </div>
  );
}
