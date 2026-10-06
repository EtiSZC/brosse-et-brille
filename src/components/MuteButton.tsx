import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isMuted, setMuted, subscribeMuted } from "@/lib/sounds";

interface MuteButtonProps {
  className?: string;
}

const MuteButton = ({ className }: MuteButtonProps) => {
  const [muted, setMutedState] = useState(isMuted);

  useEffect(() => subscribeMuted(setMutedState), []);

  return (
    <button
      onClick={() => setMuted(!muted)}
      className={cn(
        "w-14 h-14 rounded-full bg-white/80 hover:bg-white border-[3px] border-ink/15 shadow-md flex items-center justify-center text-2xl transition-colors",
        className,
      )}
      aria-label={muted ? "Activer le son" : "Couper le son"}
      aria-pressed={muted}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
};

export default MuteButton;
