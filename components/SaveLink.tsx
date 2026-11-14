"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";

/**
 * Lets the customer keep the link to their order: opens the phone's share sheet (send it
 * to yourself, add to notes, ...) or, where there is none, copies the link.
 */
export default function SaveLink({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function save() {
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      // Closing the share sheet without choosing anything is not an error.
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await copyText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={save}>
      {copied ? <Check data-icon="inline-start" /> : <Share2 data-icon="inline-start" />}
      {copied ? "Link copied" : "Save this link"}
    </Button>
  );
}
