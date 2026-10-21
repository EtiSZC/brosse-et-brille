import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { SYNC_PREFIX } from "@/lib/sync";

interface CameraScannerProps {
  onResult: (text: string) => void;
  onCancel: () => void;
}

const MAX_SIDE = 640; // downscale frames: fast enough on an iPhone, plenty for a QR code
const SCAN_EVERY_MS = 100;

/**
 * In-browser QR scanner (PWA / iPhone): back camera via getUserMedia, frames decoded
 * with jsQR. Only Brosse & Brille codes are accepted. The camera stops as soon as a
 * code is read, on cancel, or when the component unmounts.
 */
const CameraScanner = ({ onResult, onCancel }: CameraScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let done = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const stop = () => {
      done = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (s) => {
        if (done) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current!;
        video.srcObject = s;
        await video.play().catch(() => {});
        timer = setInterval(() => {
          if (!ctx || !video.videoWidth) return;
          const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
          if (code?.data.startsWith(SYNC_PREFIX)) {
            stop();
            onResult(code.data);
          }
        }, SCAN_EVERY_MS);
      })
      .catch((e: DOMException) => {
        setError(
          e?.name === "NotAllowedError"
            ? "Autorisez l'appareil photo pour scanner (Réglages › Safari › Appareil photo), ou utilisez « Coller un code »."
            : "Aucun appareil photo disponible. Utilisez « Coller un code ».",
        );
      });

    return stop;
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-ink flex flex-col items-center justify-center gap-6 px-6" role="dialog" aria-label="Scanner le QR code">
      {error ? (
        <p role="alert" className="max-w-xs rounded-2xl bg-white p-4 font-body font-semibold text-ink text-center">
          {error}
        </p>
      ) : (
        <div className="relative w-full max-w-xs aspect-square overflow-hidden rounded-3xl">
          <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div aria-hidden className="absolute inset-6 rounded-2xl border-4 border-sunshine" />
        </div>
      )}
      <p className="font-display font-bold text-white text-center">Visez le QR code de l'autre téléphone</p>
      <Button variant="outline" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
};

export default CameraScanner;
