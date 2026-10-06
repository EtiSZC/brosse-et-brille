import { motion } from "framer-motion";
import mascotImg from "@/assets/mascot.png";
import { Button } from "@/components/ui/button";
import MuteButton from "@/components/MuteButton";
import { playStartSound, unlockAudio } from "@/lib/sounds";

interface HomeScreenProps {
  onStart: () => void;
}

const HomeScreen = ({ onStart }: HomeScreenProps) => {
  const handleStart = () => {
    unlockAudio(); // inside the tap: allows the timer-driven chimes on iOS
    playStartSound();
    onStart();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen gradient-sky px-6 py-8">
      <MuteButton className="absolute top-4 left-4" />

      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-4"
      >
        <img
          src={mascotImg}
          alt="Brillou la mascotte"
          className="w-48 h-48 sm:w-64 sm:h-64 mascot-bounce drop-shadow-lg"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl sm:text-5xl font-display font-bold text-foreground text-center mb-2"
      >
        Brosse & Brille
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-lg sm:text-xl text-muted-foreground font-body text-center mb-8 max-w-xs"
      >
        3 minutes pour des dents qui brillent ! ✨
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
      >
        <Button variant="hero" size="lg" onClick={handleStart}>
          🪥 C'est parti !
        </Button>
      </motion.div>
    </div>
  );
};

export default HomeScreen;
