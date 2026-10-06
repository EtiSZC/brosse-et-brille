import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import mascotImg from "@/assets/mascot.png";
import { BRUSHING_ZONES, TOTAL_DURATION, getZoneAt } from "@/data/brushingZones";
import ProgressBar from "./ProgressBar";
import ToothDiagram from "./ToothDiagram";
import MuteButton from "./MuteButton";
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

  const globalProgress = elapsed / TOTAL_DURATION;
  const zoneProgress = zoneElapsed / currentZone.durationSeconds;
  const remainingTotal = TOTAL_DURATION - elapsed;
  const mins = Math.floor(remainingTotal / 60);
  const secs = remainingTotal % 60;
  const remainingLabel = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      className="relative flex flex-col items-center justify-between min-h-screen px-4 py-6 sm:px-6 sm:py-8 transition-colors duration-700"
      style={{
        background: `linear-gradient(180deg, hsl(${currentZone.hue} 80% 92%) 0%, hsl(${currentZone.hue} 60% 96%) 100%)`,
      }}
    >
      <MuteButton className="absolute top-4 left-4" />

      {/* Quit: opens the pause screen instead of cancelling right away */}
      <button
        onClick={() => setPaused(true)}
        className="absolute top-4 right-4 w-14 h-14 rounded-full bg-white/70 hover:bg-white shadow-md flex items-center justify-center text-xl text-foreground transition-colors"
        aria-label="Arrêter"
      >
        ✕
      </button>

      {/* Timer */}
      <div className="text-center">
        <motion.p
          className="text-5xl sm:text-6xl font-display font-bold text-foreground"
          key={remainingTotal}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {remainingLabel}
        </motion.p>
        <ProgressBar progress={globalProgress} />
      </div>

      {/* Visual zone area */}
      <div className="flex flex-col items-center flex-1 justify-center gap-3">
        {/* Tooth diagram + direction arrow side by side */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentZoneIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 sm:gap-6"
          >
            <ToothDiagram activeRegions={currentZone.highlight} hue={currentZone.hue} />
            <motion.img
              src={mascotImg}
              alt="Brillou"
              className="w-20 h-20 sm:w-28 sm:h-28 mascot-bounce drop-shadow-lg"
            />
          </motion.div>
        </AnimatePresence>

        {/* Small text label (for readers) */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentZoneIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm sm:text-base text-muted-foreground font-body text-center max-w-xs"
          >
            {currentZone.emoji} {currentZone.label} — {currentZone.instruction}
          </motion.p>
        </AnimatePresence>

        {/* Zone mini progress */}
        <div className="w-48 h-2.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: `hsl(${currentZone.hue}, 65%, 55%)` }}
            animate={{ width: `${zoneProgress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground font-body">
          {currentZoneIndex + 1} / {BRUSHING_ZONES.length}
        </p>
      </div>

      {/* Encouragements + pause */}
      <div className="flex flex-col items-center gap-4">
        <motion.p
          className="text-sm text-muted-foreground font-body italic"
          key={Math.floor(elapsed / 15)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {getEncouragement(elapsed)}
        </motion.p>
        <button
          onClick={() => setPaused(true)}
          className="w-16 h-16 rounded-full bg-white/80 hover:bg-white shadow-lg flex items-center justify-center text-3xl transition-colors active:scale-95"
          aria-label="Pause"
        >
          ⏸️
        </button>
      </div>

      {/* Pause screen: resuming is the default, stopping is a deliberate second tap */}
      <AnimatePresence>
        {paused && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
          >
            <img src={mascotImg} alt="" className="w-32 h-32 drop-shadow-lg" />
            <h2 id="pause-title" className="text-4xl font-display font-bold text-foreground">
              Pause
            </h2>
            <p className="text-lg text-muted-foreground font-body text-center max-w-xs">
              Brillou t'attend ! Encore {remainingLabel} de brossage.
            </p>
            <Button variant="hero" size="lg" onClick={handleResume} autoFocus>
              ▶️ Continuer
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Arrêter
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
