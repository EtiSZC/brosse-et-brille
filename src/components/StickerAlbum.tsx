import { useState } from "react";
import { motion } from "framer-motion";
import BathroomBackground from "@/components/BathroomBackground";
import { STICKERS, displayName, getActiveProfiles, getProfile, listProfiles } from "@/lib/progress";
import { cn } from "@/lib/utils";

interface StickerAlbumProps {
  onBack: () => void;
}

/** The sticker collection: earned ones show their picture, the others a "?" card. */
const StickerAlbum = ({ onBack }: StickerAlbumProps) => {
  const profiles = listProfiles();
  const [profileId, setProfileId] = useState(() => getActiveProfiles()[0].id);
  const earned = new Set(getProfile(profileId).stickers);
  return (
    <BathroomBackground>
      <div className="flex flex-col items-center flex-1 px-4 pt-4 pb-24 gap-4">
        <div className="w-full max-w-md flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-14 h-14 rounded-full bg-white/80 hover:bg-white border-[3px] border-ink/15 shadow-md flex items-center justify-center text-2xl text-ink"
            aria-label="Retour"
          >
            ←
          </button>
          <h1 className="text-4xl font-display font-bold sticker-title">Mon album</h1>
          <span className="w-14 text-right font-display font-bold text-lg text-ink" aria-label={`${earned.size} autocollants sur ${STICKERS.length}`}>
            {earned.size}/{STICKERS.length}
          </span>
        </div>

        {/* One album per child */}
        {profiles.length > 1 && (
          <div className="w-full max-w-md flex justify-center gap-2" role="tablist" aria-label="Album de">
            {profiles.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={p.id === profileId}
                onClick={() => setProfileId(p.id)}
                className={cn(
                  "h-12 px-3 rounded-full border-[3px] flex items-center gap-1.5 font-display font-bold text-ink",
                  p.id === profileId ? "bg-mint border-ink" : "bg-white/70 border-ink/15",
                )}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {p.avatar}
                </span>
                <span className="max-w-[5rem] truncate">{displayName(p)}</span>
              </button>
            ))}
          </div>
        )}

        <ul key={profileId} className="w-full max-w-md grid grid-cols-4 gap-3">
          {STICKERS.map((s, i) => {
            const has = earned.has(s.id);
            return (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5",
                  has
                    ? "bg-white border-[3px] border-ink shadow-[0_4px_0_hsl(var(--ink)/0.15)]"
                    : "bg-white/40 border-[3px] border-dashed border-ink/25",
                )}
                aria-label={has ? s.name : "Autocollant à gagner"}
              >
                <span className={cn("text-4xl leading-none", !has && "font-display font-bold text-ink/30 text-3xl")}>
                  {has ? s.emoji : "?"}
                </span>
                {has && <span className="text-[11px] font-body font-semibold text-ink/70">{s.name}</span>}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </BathroomBackground>
  );
};

export default StickerAlbum;
