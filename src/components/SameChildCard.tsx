import { Button } from "@/components/ui/button";
import { getProfile, mergeProfiles } from "@/lib/progress";
import { dismissSameChild, type SameChildSuggestion } from "@/lib/sync";

interface SameChildCardProps {
  suggestion: SameChildSuggestion;
  /** Called after a merge or a dismissal so the parent screen reloads the profiles. */
  onChange: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** "Ces deux profils sont le même enfant ?" — fold a duplicate into the right child, losing nothing. */
const SameChildCard = ({ suggestion, onChange }: SameChildCardProps) => {
  const { other, candidates, reason } = suggestion;
  const history = getProfile(other.id);
  const contents = [plural(history.stickers.length, "autocollant"), plural(history.sessions.length, "brossage")].join(" et ");
  const merge = (keepId: string) => {
    mergeProfiles(keepId, other.id);
    onChange();
  };
  const dismiss = () => {
    dismissSameChild(other.id);
    onChange();
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-3 bg-sunshine/30 border-[3px] border-ink rounded-3xl p-4" role="region" aria-label="Profil en double">
      {reason === "same-name" ? (
        <>
          <p className="font-display font-bold text-lg text-ink">« {other.name} » apparaît deux fois</p>
          <p className="text-sm font-body font-semibold text-ink/80">
            Si c'est le même enfant, ses autocollants et ses brossages sont réunis dans un seul album. Rien n'est perdu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" onClick={() => merge(candidates[0].id)}>
              Oui, fusionner
            </Button>
            <Button variant="outline" size="sm" onClick={dismiss}>
              Non, ce sont deux enfants
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="font-display font-bold text-lg text-ink">
            {other.avatar} « Moi » contient {contents}
          </p>
          <p className="text-sm font-body font-semibold text-ink/80">
            Ce profil sans prénom vient sans doute d'une ancienne synchronisation. C'est quel enfant ? Tout sera réuni dans son album, rien n'est perdu.
          </p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <Button key={c.id} variant="default" size="sm" onClick={() => merge(c.id)}>
                C'est {c.avatar} {c.name}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={dismiss}>
              Non, un autre enfant
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SameChildCard;
