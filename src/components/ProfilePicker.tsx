import { useState } from "react";
import { motion } from "framer-motion";
import AppTitle from "@/components/AppTitle";
import BathroomBackground from "@/components/BathroomBackground";
import LongPressButton from "@/components/LongPressButton";
import { Button } from "@/components/ui/button";
import { displayName, type ProfileMeta } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface ProfilePickerProps {
  profiles: ProfileMeta[];
  /** One or several children (brushing together). */
  onPick: (ids: string[]) => void;
  onParents: () => void;
}

/** "Qui se brosse les dents ?" — one tap picks a child; "Brosser ensemble" picks several. */
const ProfilePicker = ({ profiles, onPick, onParents }: ProfilePickerProps) => {
  const [together, setTogether] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const tap = (id: string) => {
    if (!together) return onPick([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  return (
    <BathroomBackground>
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-10 pb-24 gap-6">
        <p className="text-5xl sm:text-6xl font-display font-bold text-center sticker-title">
          <AppTitle />
        </p>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-center sticker-title">
          {together ? "Qui brosse ensemble\u00A0?" : "Qui se brosse les dents\u00A0?"}
        </h1>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {profiles.map((p, i) => {
            const isSelected = selected.includes(p.id);
            return (
              <motion.button
                key={p.id}
                onClick={() => tap(p.id)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 260 }}
                aria-pressed={together ? isSelected : undefined}
                className={cn(
                  "relative aspect-square rounded-3xl bg-white border-[3px] border-ink flex flex-col items-center justify-center gap-1 shadow-[0_6px_0_hsl(var(--ink)/0.18)] active:translate-y-1 active:shadow-none transition-[transform,box-shadow]",
                  isSelected && "bg-mint",
                )}
              >
                <span className="text-6xl leading-none" aria-hidden>
                  {p.avatar}
                </span>
                <span className="font-display font-bold text-xl text-ink">{displayName(p)}</span>
                {isSelected && (
                  <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white border-2 border-ink flex items-center justify-center font-bold text-ink">
                    ✓
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {together ? (
          <div className="flex flex-col items-center gap-3">
            <Button variant="hero" size="lg" disabled={!selected.length} onClick={() => onPick(selected)}>
              C'est parti !
            </Button>
            <Button variant="outline" onClick={() => (setTogether(false), setSelected([]))}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setTogether(true)}>
            🪥 Brosser ensemble
          </Button>
        )}

        <LongPressButton onLongPress={onParents} label="Espace parents : maintenir 2 secondes" className="mt-2">
          ⚙︎ Parents
        </LongPressButton>
      </div>
    </BathroomBackground>
  );
};

export default ProfilePicker;
