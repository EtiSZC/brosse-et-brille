import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isMusicOn, setMusicOn, subscribeMusic } from "@/lib/music";

/** 🎵 toggle for the background music (on by default, remembered). */
const MusicButton = ({ className }: { className?: string }) => {
  const [on, setOn] = useState(isMusicOn);
  useEffect(() => subscribeMusic(setOn), []);

  return (
    <button
      onClick={() => setMusicOn(!on)}
      className={cn(
        "relative w-14 h-14 rounded-full bg-white/80 hover:bg-white border-[3px] border-ink/15 shadow-md flex items-center justify-center text-2xl transition-colors",
        className,
      )}
      aria-label={on ? "Couper la musique" : "Activer la musique"}
      aria-pressed={!on}
    >
      <span className={cn(!on && "opacity-40")}>🎵</span>
      {!on && <span aria-hidden className="absolute w-9 h-[3px] rounded-full bg-ink rotate-45" />}
    </button>
  );
};

export default MusicButton;
