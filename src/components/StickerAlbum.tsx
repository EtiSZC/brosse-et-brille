import { useState } from "react";
import { motion } from "framer-motion";
import BathroomBackground from "@/components/BathroomBackground";
import {
  ALL_STICKERS,
  STICKER_SETS,
  displayName,
  getActiveProfiles,
  getProfile,
  isHalloweenSeason,
  listProfiles,
} from "@/lib/progress";
import { cn } from "@/lib/utils";

interface StickerAlbumProps {
  onBack: () => void;
  /** Injectable for tests (Halloween season or not). */
  now?: Date;
}

/**
 * The sticker collection, one page per set (classics, then Halloween): earned ones show
 * their picture, the others a "?" card (a 🎃 for Halloween ones, which come back in October).
 */
const StickerAlbum = ({ onBack, now = new Date() }: StickerAlbumProps) => {
  const profiles = listProfiles();
  const [profileId, setProfileId] = useState(() => getActiveProfiles()[0].id);
  const earned = new Set(getProfile(profileId).stickers);
  const total = ALL_STICKERS.filter((s) => earned.has(s.id)).length;
  const season = isHalloweenSeason(now);
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
          <span className="w-14 text-right font-display font-bold text-lg text-ink" aria-label={`${total} autocollants sur ${ALL_STICKERS.length}`}>
            {total}/{ALL_STICKERS.length}
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

        {STICKER_SETS.map((set) => {
          const spooky = set.id === "halloween";
          const won = set.stickers.filter((s) => earned.has(s.id)).length;
          return (
            <section
              key={`${profileId}-${set.id}`}
              aria-label={set.title}
              className={cn("w-full max-w-md flex flex-col gap-3", spooky && "rounded-3xl bg-[#2B1B4A] p-3 border-[3px] border-ink")}
            >
              <h2 className={cn("flex items-center justify-between font-display font-bold text-xl px-1", spooky ? "text-[#FFB067]" : "text-ink")}>
                <span>{spooky ? "🎃 Halloween 🦇" : set.title}</span>
                <span className="text-base" aria-label={`${won} sur ${set.stickers.length}`}>
                  {won}/{set.stickers.length}
                </span>
              </h2>
              {spooky && won < set.stickers.length && (
                <p className="px-1 -mt-2 text-sm font-body font-semibold text-white/80">
                  {season ? "Seulement pendant Halloween\u00A0!" : "Ils reviennent en octobre\u00A0!"}
                </p>
              )}
              <ul className="grid grid-cols-4 gap-3">
                {set.stickers.map((s, i) => {
                  const has = earned.has(s.id);
                  return (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        "aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5",
                        has && !spooky && "bg-white border-[3px] border-ink shadow-[0_4px_0_hsl(var(--ink)/0.15)]",
                        has && spooky && "bg-white border-[3px] border-[#FF8A3D] shadow-[0_0_12px_#FF8A3D]",
                        !has && !spooky && "bg-white/40 border-[3px] border-dashed border-ink/25",
                        !has && spooky && "bg-white/10 border-[3px] border-dashed border-white/30",
                      )}
                      aria-label={has ? s.name : "Autocollant à gagner"}
                    >
                      {has ? (
                        <>
                          <span className="text-4xl leading-none">{s.emoji}</span>
                          <span className="text-[11px] leading-tight text-center font-body font-semibold text-ink/70">{s.name}</span>
                        </>
                      ) : spooky ? (
                        <span className="text-3xl leading-none opacity-30 grayscale">🎃</span>
                      ) : (
                        <span className="font-display font-bold text-ink/30 text-3xl leading-none">?</span>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </BathroomBackground>
  );
};

export default StickerAlbum;
