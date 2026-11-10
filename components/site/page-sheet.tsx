"use client";

import { ViewTransition } from "react";
import { playPageTurn } from "@/lib/page-sound";

// Page turns: navigations tagged with TURN_FORWARD / TURN_BACK (lib/turn.ts)
// turn the page like a leaf of a book (see "Page turns" in globals.css), with
// the sound of paper (lib/page-sound.ts). TurnOrigin (turn-origin.tsx) records
// where the visible part of the page is, so the leaf pivots around what's on
// screen however long the page is.

const PAGE_ENTER = { "page-forward": "turn-reveal", "page-back": "turn-over", default: "none" };
const PAGE_EXIT = { "page-forward": "turn-away", "page-back": "turn-under", default: "none" };

let lastTurn = 0;

/**
 * React calls this as a turn starts: once for the page leaving and once for
 * the page arriving (and only when the turn animates). One sound per turn.
 */
function rustle(_: unknown, types: string[]) {
  const now = performance.now();
  if (now - lastTurn < 250) return;
  if (types.includes("page-forward")) playPageTurn({ direction: 1 });
  else if (types.includes("page-back")) playPageTurn({ direction: -1 });
  else return;
  lastTurn = now;
}

/** One page of the site. Wrap each public page in it (layouts persist, pages don't). */
export function PageSheet({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={PAGE_ENTER} exit={PAGE_EXIT} default="none" onEnter={rustle} onExit={rustle}>
      <div className="page-sheet">{children}</div>
    </ViewTransition>
  );
}

const REGION_ENTER = { "page-forward": "region-reveal", "page-back": "region-over", default: "none" };
const REGION_EXIT = { "page-forward": "region-away", "page-back": "region-under", default: "none" };

/**
 * Turns part of a page when its content changes within the same route, e.g.
 * the next page of results. Give it a `key` that changes with that content.
 */
export function TurnRegion({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={REGION_ENTER} exit={REGION_EXIT} default="none" onEnter={rustle} onExit={rustle}>
      <div className="turn-region bg-bg">{children}</div>
    </ViewTransition>
  );
}
