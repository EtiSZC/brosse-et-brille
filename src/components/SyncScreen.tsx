import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import BathroomBackground from "@/components/BathroomBackground";
import { Button } from "@/components/ui/button";
import { displayName, loadProgress, replaceProgress } from "@/lib/progress";
import { canScan, scanQr, usesNativeScanner } from "@/lib/scanner";
import CameraScanner from "@/components/CameraScanner";
import {
  decodeState,
  encodeState,
  mergeState,
  suggestMatches,
  type Match,
  type MatchTarget,
  type MergeSummaryItem,
} from "@/lib/sync";

interface SyncScreenProps {
  onBack: () => void;
}

type Step =
  | { kind: "show" }
  | { kind: "match"; matches: Match[] }
  | { kind: "preview"; matches: Match[] }
  | { kind: "done"; summary: MergeSummaryItem[] };

/** QR as an SVG data URL (sharp at any size, no canvas needed). */
function useQrImage(text: string) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 2 }).then((svg) => {
      if (alive) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    });
    return () => {
      alive = false;
    };
  }, [text]);
  return src;
}

const QrCard = ({ text, caption }: { text: string; caption: string }) => {
  const src = useQrImage(text);
  return (
    <div className="w-full max-w-xs flex flex-col items-center gap-2 bg-white border-[3px] border-ink rounded-3xl p-4 shadow-[0_5px_0_hsl(var(--ink)/0.15)]">
      <p className="font-display font-bold text-lg text-ink text-center">{caption}</p>
      {src ? <img src={src} alt="QR code de ce téléphone" className="w-full aspect-square" /> : <div className="w-full aspect-square" />}
    </div>
  );
};

const targetValue = (t: MatchTarget) => (t.kind === "local" ? `local:${t.id}` : t.kind);
const parseTarget = (v: string): MatchTarget => (v.startsWith("local:") ? { kind: "local", id: v.slice(6) } : { kind: v as "add" | "ignore" });

/** Phone-to-phone sync: show this phone's QR, scan the other one, match children, preview, merge. */
const SyncScreen = ({ onBack }: SyncScreenProps) => {
  const [step, setStep] = useState<Step>({ kind: "show" });
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false); // in-browser scanner (PWA)
  const [local, setLocal] = useState(loadProgress); // this phone's state (updated after a merge)
  const myCode = useMemo(() => encodeState(local), [local]);

  const readCode = (text: string) => {
    const result = decodeState(text.trim());
    if (!result.ok) return setError(result.error);
    setError("");
    const matches = suggestMatches(local, result.profiles);
    const alreadyPaired = matches.every((m) => m.target.kind === "local" && m.target.id === m.remote.id);
    setStep(alreadyPaired ? { kind: "preview", matches } : { kind: "match", matches });
  };

  const scan = async () => {
    if (!usesNativeScanner()) return setCameraOpen(true);
    try {
      const text = await scanQr();
      if (text) readCode(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ouvrir le lecteur de QR code.");
    }
  };

  const merge = (matches: Match[]) => {
    try {
      const { data, summary } = mergeState(local, matches); // throws if anything would be lost
      replaceProgress(data);
      setLocal(loadProgress()); // re-read: the QR now shows the merged state
      setStep({ kind: "done", summary });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La synchronisation a échoué. Rien n'a été modifié.");
      setStep({ kind: "show" });
    }
  };

  // Preview of a merge, without saving (null if it would be refused).
  const previewOf = (matches: Match[]) => {
    try {
      return mergeState(local, matches).summary;
    } catch {
      return null;
    }
  };

  return (
    <BathroomBackground>
      <div className="flex flex-col items-center flex-1 px-4 pt-4 pb-24 gap-4">
        <div className="w-full max-w-md flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-14 h-14 shrink-0 rounded-full bg-white/80 hover:bg-white border-[3px] border-ink/15 shadow-md flex items-center justify-center text-2xl text-ink"
            aria-label="Retour"
          >
            ←
          </button>
          <h1 className="text-3xl font-display font-bold sticker-title">Synchroniser</h1>
        </div>

        {step.kind === "show" && (
          <>
            <QrCard text={myCode} caption="Montrez ce code à l'autre téléphone" />
            {canScan() && (
              <Button variant="hero" size="lg" onClick={scan}>
                📷 Scanner l'autre téléphone
              </Button>
            )}
            <details className="w-full max-w-xs" open={!canScan()}>
              <summary className="font-body font-semibold text-sm text-muted-foreground cursor-pointer">Ou coller un code</summary>
              <div className="flex flex-col gap-2 mt-2">
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  aria-label="Code de l'autre téléphone"
                  rows={3}
                  className="w-full rounded-2xl border-2 border-ink/20 p-2 font-mono text-xs bg-white/80"
                />
                <Button variant="outline" size="sm" onClick={() => readCode(pasted)} disabled={!pasted.trim()}>
                  Lire le code
                </Button>
              </div>
            </details>
            <p className="w-full max-w-xs text-xs font-body font-semibold text-muted-foreground text-center">
              Le code contient les prénoms et l'historique. Il passe d'un téléphone à l'autre sans internet, rien n'est envoyé ailleurs.
            </p>
          </>
        )}

        {step.kind === "match" && (
          <div className="w-full max-w-md flex flex-col gap-3">
            <p className="font-display font-bold text-xl text-ink text-center">Qui est qui ?</p>
            {step.matches.map((m, i) => (
              <label key={m.remote.id} className="flex items-center gap-3 bg-white border-[3px] border-ink rounded-3xl p-3">
                <span className="text-4xl leading-none" aria-hidden>
                  {m.remote.avatar}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display font-bold text-ink truncate">{m.remote.name || "Sans prénom"}</span>
                  <span className="block text-xs text-muted-foreground">sur l'autre téléphone</span>
                </span>
                <select
                  value={targetValue(m.target)}
                  aria-label={`${m.remote.name || "Enfant"} correspond à`}
                  onChange={(e) => {
                    const matches = step.matches.map((x, j) => (j === i ? { ...x, target: parseTarget(e.target.value) } : x));
                    setStep({ kind: "match", matches });
                  }}
                  className="h-11 rounded-2xl border-2 border-ink/20 px-2 font-display font-semibold text-ink bg-tile/50"
                >
                  {local.profiles.map((p) => (
                    <option key={p.id} value={`local:${p.id}`}>
                      = {p.avatar} {displayName(p)}
                    </option>
                  ))}
                  <option value="add">+ Ajouter ici</option>
                  <option value="ignore">Ignorer</option>
                </select>
              </label>
            ))}
            <Button variant="hero" size="lg" onClick={() => setStep({ kind: "preview", matches: step.matches })}>
              Continuer
            </Button>
          </div>
        )}

        {step.kind === "preview" && (
          <div className="w-full max-w-md flex flex-col gap-3">
            <p className="font-display font-bold text-xl text-ink text-center">Ce qui va être ajouté</p>
            <ul className="flex flex-col gap-2">
              {(previewOf(step.matches) ?? []).map((s) => (
                <li key={s.id} className="flex items-center gap-3 bg-white border-[3px] border-ink rounded-2xl px-3 py-2 font-display font-semibold text-ink">
                  <span className="text-3xl leading-none" aria-hidden>
                    {s.avatar}
                  </span>
                  <span className="flex-1 truncate">{s.name || "Moi"}</span>
                  <span className="text-sm text-ink/80">
                    {s.isNew
                      ? "nouveau"
                      : s.addedSessions || s.addedStickers
                        ? `+${s.addedSessions} brossage${s.addedSessions > 1 ? "s" : ""}, +${s.addedStickers} autocollant${s.addedStickers > 1 ? "s" : ""}`
                        : "déjà à jour"}
                  </span>
                </li>
              ))}
              {step.matches
                .filter((m) => m.target.kind === "ignore")
                .map((m) => (
                  <li key={`ignored-${m.remote.id}`} className="flex items-center gap-3 bg-white/60 border-2 border-dashed border-ink/30 rounded-2xl px-3 py-2 font-display font-semibold text-ink/70">
                    <span className="text-3xl leading-none" aria-hidden>
                      {m.remote.avatar}
                    </span>
                    <span className="flex-1 truncate">{m.remote.name || "Sans prénom"}</span>
                    <span className="text-sm">ignoré · rien n'est retiré ici</span>
                  </li>
                ))}
            </ul>
            <p className="text-xs font-body font-semibold text-muted-foreground text-center">
              La synchronisation ne fait qu'ajouter : aucun autocollant ni brossage n'est jamais retiré.
            </p>
            <Button variant="hero" size="lg" onClick={() => merge(step.matches)}>
              Fusionner
            </Button>
            <Button variant="outline" onClick={() => setStep({ kind: "show" })}>
              Annuler
            </Button>
          </div>
        )}

        {step.kind === "done" && (
          <>
            <p className="font-display font-bold text-2xl text-ink">✓ Synchronisé</p>
            <QrCard text={myCode} caption="À votre tour : faites scanner ce code par l'autre téléphone" />
            <Button variant="default" onClick={onBack}>
              Terminer
            </Button>
          </>
        )}

        {cameraOpen && (
          <CameraScanner
            onResult={(text) => {
              setCameraOpen(false);
              readCode(text);
            }}
            onCancel={() => setCameraOpen(false)}
          />
        )}

        {error && (
          <p role="alert" className="w-full max-w-xs rounded-2xl bg-bubblegum/25 p-3 font-body font-semibold text-ink text-center">
            {error}
          </p>
        )}
      </div>
    </BathroomBackground>
  );
};

export default SyncScreen;
