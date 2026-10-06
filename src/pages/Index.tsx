import { useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import BrushingScreen from "@/components/BrushingScreen";
import CelebrationScreen from "@/components/CelebrationScreen";

type AppState = "home" | "brushing" | "celebration";

const Index = () => {
  const [state, setState] = useState<AppState>("home");

  return (
    <>
      {state === "home" && <HomeScreen onStart={() => setState("brushing")} />}
      {state === "brushing" && <BrushingScreen onComplete={() => setState("celebration")} onCancel={() => setState("home")} />}
      {state === "celebration" && <CelebrationScreen onRestart={() => setState("home")} />}
    </>
  );
};

export default Index;
