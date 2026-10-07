import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import mascotCelebrateImg from "@/assets/mascot-celebrate.png";
import { Button } from "@/components/ui/button";
import BathroomBackground from "@/components/BathroomBackground";
import { playFanfare, playStarSound } from "@/lib/sounds";
import { speak, stopSpeaking } from "@/lib/voice";
import { CELEBRATION_LINE } from "@/data/voiceLines";

interface CelebrationScreenProps {
  onRestart: () => void;
}

const CelebrationScreen = ({ onRestart }: CelebrationScreenProps) => {
  const hasPlayed = useRef(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    // Sound
    playFanfare();
    setTimeout(() => playStarSound(), 800);
    setTimeout(() => playStarSound(), 1200);
    speakTimer.current = setTimeout(() => speak(CELEBRATION_LINE), 1500);

    // Confetti bursts
    const fire = (opts: confetti.Options) => {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3CCFB4", "#FF7EB6", "#FFD23F", "#7EC8E3", "#FFFFFF"],
        disableForReducedMotion: true,
        ...opts,
      });
    };

    fire({ angle: 60, origin: { x: 0, y: 0.7 } });
    fire({ angle: 120, origin: { x: 1, y: 0.7 } });

    setTimeout(() => {
      fire({ angle: 90, origin: { x: 0.5, y: 0.8 }, particleCount: 120, spread: 100 });
    }, 600);
  }, []);
  useEffect(
    () => () => {
      clearTimeout(speakTimer.current); // leaving early: don't talk over the next screen
      stopSpeaking();
    },
    [],
  );

  return (
    <BathroomBackground tint="hsl(46 100% 80% / 0.45)">
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-8 pb-24">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
        >
          <img
            src={mascotCelebrateImg}
            alt="Brillou célèbre"
            className="w-52 h-52 sm:w-64 sm:h-64 mascot-celebrate drop-shadow-xl"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-5xl sm:text-6xl font-display font-bold text-center mt-4 mb-3 sticker-title"
        >
          Bravo ! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground font-body font-semibold text-center mb-2 max-w-xs"
        >
          Tes dents sont toutes propres et brillantes ! ✨🦷
        </motion.p>

        {/* Stars */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
          className="flex gap-2 my-4"
        >
          {[...Array(3)].map((_, i) => (
            <motion.span
              key={i}
              className="text-5xl sparkle drop-shadow-md"
              style={{ animationDelay: `${i * 0.3}s` }}
              initial={{ rotate: -30, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 1 + i * 0.2, type: "spring" }}
            >
              ⭐
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring" }}
        >
          <Button variant="secondary" size="lg" onClick={onRestart}>
            🔄 Recommencer
          </Button>
        </motion.div>
      </div>
    </BathroomBackground>
  );
};

export default CelebrationScreen;
