"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Volume2, VolumeOff } from "lucide-react";
import { isSoundOn, playPageTurn, setSoundOn, subscribeSound, wakeSound } from "@/lib/page-sound";
import { cn } from "@/lib/text";

/** Switches the page-turn sound on or off. The choice is kept in this browser. */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => true);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Page-turn sound"
      title={on ? "Page-turn sound: on" : "Page-turn sound: off"}
      onClick={() => {
        setSoundOn(!on);
        // Let the reader hear what they've just switched on.
        if (!on) playPageTurn();
      }}
      className={cn("btn btn-ghost btn-icon", className)}
    >
      {on ? <Volume2 className="size-5" aria-hidden /> : <VolumeOff className="size-5" aria-hidden />}
    </button>
  );
}

const GESTURES = ["pointerup", "keydown", "touchend"] as const;

/**
 * Browsers only let a page start sound during a tap, click or key press, and
 * a page turn starts a moment later. This wakes the audio on each of those
 * gestures, so the turn that follows is heard. Renders nothing.
 */
export function SoundUnlock() {
  useEffect(() => {
    GESTURES.forEach((type) => document.addEventListener(type, wakeSound, { capture: true, passive: true }));
    return () => GESTURES.forEach((type) => document.removeEventListener(type, wakeSound, { capture: true }));
  }, []);
  return null;
}
