"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOwnerUi } from "@/lib/owner-store";

/** Short confirmation at the bottom of the screen ("Saved", "Marked ready", ...). */
export default function Toast() {
  const toast = useOwnerUi((s) => s.toast);
  const clearToast = useOwnerUi((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, toast.error ? 5000 : 2500);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-10 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 font-semibold text-background shadow-lg [&_svg]:size-4",
              toast.error ? "bg-destructive" : "bg-foreground",
            )}
          >
            {toast.error ? <CircleAlert /> : <Check />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
