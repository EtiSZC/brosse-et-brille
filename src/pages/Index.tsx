import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import BrushingScreen from "@/components/BrushingScreen";
import CelebrationScreen from "@/components/CelebrationScreen";
import StickerAlbum from "@/components/StickerAlbum";
import { recordSession, type SessionResult } from "@/lib/progress";

type AppState = "home" | "brushing" | "celebration" | "album";

const Index = () => {
  const [state, setState] = useState<AppState>("home");
  const [result, setResult] = useState<SessionResult | null>(null);

  const handleComplete = () => {
    setResult(recordSession()); // saved on the device: calendar, streak, sticker
    setState("celebration");
  };

  return (
    <>
      {state === "home" && <HomeScreen onStart={() => setState("brushing")} onAlbum={() => setState("album")} />}
      {state === "brushing" && <BrushingScreen onComplete={handleComplete} onCancel={() => setState("home")} />}
      {state === "celebration" && (
        <CelebrationScreen result={result} onDone={() => setState("home")} onAlbum={() => setState("album")} />
      )}
      {state === "album" && <StickerAlbum onBack={() => setState("home")} />}
    </>
  );
};

export default Index;
