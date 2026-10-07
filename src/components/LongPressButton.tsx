import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LongPressButtonProps {
  onLongPress: () => void;
  /** Accessible label (should mention the hold, e.g. "maintenir 2 secondes"). */
  label: string;
  durationMs?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Parent gate: fires only after being held for `durationMs` (a fill shows the
 * progress; releasing early cancels). Works with touch, mouse and keyboard.
 */
const LongPressButton = ({ onLongPress, label, durationMs = 2000, className, children }: LongPressButtonProps) => {
  const [pressing, setPressing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const start = () => {
    clearTimeout(timer.current);
    setPressing(true);
    timer.current = setTimeout(() => {
      setPressing(false);
      onLongPress();
    }, durationMs);
  };
  const cancel = () => {
    clearTimeout(timer.current);
    setPressing(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()} // no Android long-press menu
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={cancel}
      className={cn(
        "relative overflow-hidden select-none touch-none rounded-full bg-white/80 border-[3px] border-ink/15 px-4 h-11 font-display font-semibold text-ink",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-mint/60"
        style={{ width: pressing ? "100%" : "0%", transition: pressing ? `width ${durationMs}ms linear` : "none" }}
      />
      <span className="relative">{pressing ? "Maintiens…" : children}</span>
    </button>
  );
};

export default LongPressButton;
