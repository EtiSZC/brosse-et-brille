import { motion } from "framer-motion";
import mascotImg from "@/assets/mascot.png";
import { Button } from "@/components/ui/button";
import BathroomBackground from "@/components/BathroomBackground";
import MuteButton from "@/components/MuteButton";
import SpeechBubble from "@/components/SpeechBubble";
import { playStartSound, unlockAudio } from "@/lib/sounds";

interface HomeScreenProps {
  onStart: () => void;
}

const TITLE = "Brosse & Brille";
// Small fixed tilt per letter for a hand-stuck sticker look.
const TILTS = [-3, 2, -2, 3, -1, 2, 0, -2, 0, 3, -2, 2, -3, 1, -2];

const HomeScreen = ({ onStart }: HomeScreenProps) => {
  const handleStart = () => {
    unlockAudio(); // inside the tap: allows the timer-driven chimes on iOS
    playStartSound();
    onStart();
  };

  return (
    <BathroomBackground>
      <div className="relative flex flex-col items-center justify-center flex-1 px-6 pt-8 pb-24">
        <MuteButton className="absolute top-4 left-4" />

        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 18 }}
        >
          <SpeechBubble tail="bottom" className="mb-3">
            <p className="font-display font-semibold text-xl text-ink">On brosse ensemble ?</p>
          </SpeechBubble>
        </motion.div>

        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-4"
        >
          <img
            src={mascotImg}
            alt="Brillou la mascotte"
            className="w-56 h-56 sm:w-64 sm:h-64 mascot-bounce drop-shadow-xl"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-5xl sm:text-6xl font-display font-bold text-center mb-3 sticker-title"
          aria-label={TITLE}
        >
          {TITLE.split("").map((char, i) => (
            <span
              key={i}
              aria-hidden
              className="inline-block"
              style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)`, minWidth: char === " " ? "0.3em" : undefined }}
            >
              {char}
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground font-body font-semibold text-center mb-10 max-w-xs"
        >
          3 minutes pour des dents qui brillent{"\u00A0"}!{"\u00A0"}✨
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
        >
          <div className="breathe">
            <Button variant="hero" size="xl" onClick={handleStart}>
              🪥 C'est parti !
            </Button>
          </div>
        </motion.div>
      </div>
    </BathroomBackground>
  );
};

export default HomeScreen;
