"use client";

import { useEffect } from "react";

/**
 * Before a navigation starts (on click), records where the middle of the
 * screen falls on the current page sheet and results region. The page-turn
 * animations pivot there, so a long page turns around what's actually on
 * screen instead of around a point far below it. Renders nothing.
 */
export function TurnOrigin() {
  useEffect(() => {
    function record() {
      const root = document.documentElement;
      const middle = window.innerHeight / 2;
      for (const [selector, name] of [
        [".page-sheet", "page"],
        [".turn-region", "region"],
      ] as const) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Old snapshot: as it is on screen now. New one: scrolled to the top.
        root.style.setProperty(`--turn-${name}-old-y`, `${Math.round(middle - top)}px`);
        root.style.setProperty(`--turn-${name}-new-y`, `${Math.round(middle - (top + window.scrollY))}px`);
      }
    }
    document.addEventListener("click", record, { capture: true });
    return () => document.removeEventListener("click", record, { capture: true });
  }, []);
  return null;
}
