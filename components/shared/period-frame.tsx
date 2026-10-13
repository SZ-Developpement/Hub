"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

import { cn } from "@/lib/utils";

type Frame = { pending: boolean; startTransition: TransitionStartFunction };

const FrameContext = createContext<Frame | null>(null);

/**
 * Relie le sélecteur de période au contenu qu'il pilote : pendant le rechargement,
 * l'ancien rendu reste en place, légèrement estompé — ni squelette, ni saut de mise en page.
 */
export function PeriodFrame({ children }: { children: ReactNode }) {
  const [pending, startTransition] = useTransition();
  return <FrameContext value={{ pending, startTransition }}>{children}</FrameContext>;
}

/** Transition partagée du cadre, ou `null` hors d'un `PeriodFrame`. */
export function usePeriodFrame(): Frame | null {
  return useContext(FrameContext);
}

export function PeriodFrameBody({ children, className }: { children: ReactNode; className?: string }) {
  const frame = useContext(FrameContext);
  return (
    <div
      aria-busy={frame?.pending ?? false}
      className={cn("transition-opacity", frame?.pending && "opacity-60", className)}
    >
      {children}
    </div>
  );
}
