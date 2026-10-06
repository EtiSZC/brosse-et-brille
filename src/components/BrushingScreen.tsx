import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import mascotImg from "@/assets/mascot.png";
import { BRUSHING_ZONES, TOTAL_DURATION, getZoneAt } from "@/data/brushingZones";
import BathroomBackground from "./BathroomBackground";
import BubbleTimer from "./BubbleTimer";
import MouthDiagram from "./mouth/MouthDiagram";
import MuteButton from "./MuteButton";
import SpeechBubble from "./SpeechBubble";
import { Button } from "@/components/ui/button";
import { playZoneComplete, unlockAudio } from "@/lib/sounds";
import { useWakeLock } from "@/hooks/use-wake-lock";

interface BrushingScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

const BrushingScreen = ({ onComplete, onCancel }: BrushingScreenProps) => {
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Time accumulated before the current running stretch (survives pauses).
  const accumulatedMsRef = useRef(0);
  const prevZoneRef = useRef(0);
  const completedRef = useRef(false);

  useWakeLock(true);

  // Timestamp-based clock: elapsed time is measured, not counted, so late or
  // throttled ticks can't make it drift.
  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(accumulatedMsRef.current + Date.now() - startedAt);
    }, 250);
    return () => {
      clearInterval(interval);
      accumulatedMsRef.current += Date.now() - startedAt;
      setElapsedMs(accumulatedMsRef.current);
    };
  }, [paused]);

  // Auto-pause when the app goes to the background (call, home button...).
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") setPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const elapsed = Math.min(TOTAL_DURATION, Math.floor(elapsedMs / 1000));
  const { index: currentZoneIndex, zoneElapsed } = getZoneAt(elapsed);
  const currentZone = BRUSHING_ZONES[currentZoneIndex];

  useEffect(() => {
    if (elapsed >= TOTAL_DURATION && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [elapsed, onComplete]);

  // Play sound on zone change
  useEffect(() => {
    if (currentZoneIndex !== prevZoneRef.current && currentZoneIndex > 0) {
      playZoneComplete();
    }
    prevZoneRef.current = currentZoneIndex;
  }, [currentZoneIndex]);

  const handleResume = () => {
    unlockAudio(); // the context may have been suspended while in background
    setPaused(false);
  };

  // Smooth sub-second progress inside the zone (drives the bubble fill and germ popping).
  const zoneProgress = Math.min(
    1,
    Math.max(0, (elapsedMs / 1000 - (elapsed - zoneElapsed)) / currentZone.durationSeconds),
  );
  const remainingTotal = TOTAL_DURATION - elapsed;
  const mins = Math.floor(remainingTotal / 60);
  const secs = remainingTotal % 60;
  const remainingLabel = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <BathroomBackground tint={`hsl(${currentZone.hue} 90% 84% / 0.55)`}>
      <div className="flex flex-col items-center flex-1 px-4 pt-4 pb-6 gap-3 sm:gap-4">
        {/* Top bar: mute · small parent timer · stop */}
        <div className="w-full max-w-md flex items-center justify-between">
          <MuteButton />
          <p
            className="px-4 py-1 rounded-full bg-white/70 border-2 border-ink/15 text-lg font-display font-semibold text-ink tabular-nums"
            aria-label={`Temps restant ${remainingLabel}`}
          >
            {remainingLabel}
          </p>
          {/* Quit: opens the pause screen instead of cancelling right away */}
          <button
            onClick={() => setPaused(true)}
            className="w-14 h-14 rounded-full bg-white/80 hover:bg-white border-[3px] border-ink/15 shadow-md flex items-center justify-center text-xl text-ink transition-colors"
            aria-label="Arrêter"
          >
            ✕
          </button>
        </div>

        <BubbleTimer
          currentZoneIndex={currentZoneIndex}
          zoneProgress={zoneProgress}
          totalProgress={elapsed / TOTAL_DURATION}
        />

        {/* The mouth */}
        <div className="flex-1 w-full flex items-center justify-center">
          <MouthDiagram currentZoneIndex={currentZoneIndex} zoneProgress={zoneProgress} />
        </div>

        {/* Brillou explains the current zone */}
        <div className="w-full max-w-md flex items-center gap-3">
          <img src={mascotImg} alt="Brillou" className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 mascot-bounce drop-shadow-lg" />
          <AnimatePresence mode="wait">
            <motion.div
              key={currentZoneIndex}
              className="flex-1"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <SpeechBubble>
                <p className="font-display font-semibold text-xl sm:text-2xl leading-snug text-ink">
                  {currentZone.instruction}
                </p>
              </SpeechBubble>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Encouragement + pause */}
        <motion.p
          className="text-base text-muted-foreground font-body font-semibold italic text-center"
          key={Math.floor(elapsed / 15)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {getEncouragement(elapsed)}
        </motion.p>
        <button
          onClick={() => setPaused(true)}
          className="w-16 h-16 rounded-full bg-white border-[3px] border-ink shadow-[0_5px_0_hsl(var(--ink)/0.25)] active:translate-y-1 active:shadow-none flex items-center justify-center transition-[transform,box-shadow]"
          aria-label="Pause"
        >
          <span className="flex gap-1.5" aria-hidden>
            <span className="w-2.5 h-7 rounded-full bg-ink" />
            <span className="w-2.5 h-7 rounded-full bg-ink" />
          </span>
        </button>
      </div>

      {/* Pause screen: resuming is the default, stopping is a deliberate second tap */}
      <AnimatePresence>
        {paused && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <motion.div
              className="w-full max-w-sm flex flex-col items-center gap-4 bg-white border-[3px] border-ink rounded-[2rem] px-6 pt-6 pb-8 shadow-[0_8px_0_hsl(var(--ink)/0.2)]"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <img src={mascotImg} alt="" className="w-28 h-28 drop-shadow-lg" />
              <h2 id="pause-title" className="text-4xl font-display font-bold sticker-title">
                Pause
              </h2>
              <p className="text-lg text-muted-foreground font-body font-semibold text-center">
                Brillou t'attend ! Encore {remainingLabel} de brossage.
              </p>
              <Button variant="hero" size="lg" onClick={handleResume} autoFocus className="mt-2">
                ▶ Continuer
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Arrêter
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BathroomBackground>
  );
};

function getEncouragement(elapsed: number): string {
  const messages = [
    "Tu te débrouilles super bien ! 🌟",
    "Continue comme ça, champion ! 💪",
    "Tes dents vont briller ! ✨",
    "Brillou est fier de toi ! 😊",
    "Tu es un pro du brossage ! 🏆",
    "Encore un peu, courage ! 🎉",
    "Super travail ! 👏",
    "Les microbes n'ont qu'à bien se tenir ! 🦠💨",
    "Tes dents te disent merci ! 🦷❤️",
    "Presque fini, bravo ! 🎊",
    "Tu es une star du brossage ! ⭐",
    "Magnifique technique ! 👌",
  ];
  const index = Math.floor(elapsed / 15) % messages.length;
  return messages[index];
}

export default BrushingScreen;
