import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SyncScreen from "./SyncScreen";
import ParentsScreen from "./ParentsScreen";
import { addProfile, getProfile, listProfiles, recordSession, type ProgressData } from "@/lib/progress";
import { encodeState } from "@/lib/sync";

vi.mock("@/lib/scanner", () => ({ canScan: () => false, scanQr: vi.fn() }));

const otherPhone = (profiles: { id: string; name: string; avatar: string; stickers: string[]; sessions: { date: string; slot: "morning" | "evening" }[] }[]): string => {
  const data: ProgressData = {
    version: 2,
    profiles: profiles.map(({ id, name, avatar }) => ({ id, name, avatar })),
    data: Object.fromEntries(profiles.map((p) => [p.id, { sessions: p.sessions, stickers: p.stickers }])),
    active: [profiles[0].id],
  };
  return encodeState(data);
};
const paste = (code: string) => {
  fireEvent.change(screen.getByLabelText("Code de l'autre téléphone"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Lire le code" }));
};

describe("sync screen", () => {
  let leaId: string;
  beforeEach(() => {
    localStorage.clear();
    leaId = addProfile("Léa", "🦊")!.id;
    recordSession(new Date(2026, 9, 10, 8), leaId, () => 0); // unicorn
  });

  it("shows this phone's QR code", async () => {
    render(<SyncScreen onBack={() => {}} />);
    await waitFor(() => expect(screen.getByAltText("QR code de ce téléphone")).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml")));
  });

  it("first sync: match by name, add the new child, preview, merge, then show the updated code", async () => {
    render(<SyncScreen onBack={() => {}} />);
    paste(
      otherPhone([
        { id: "premoteLea", name: "lea", avatar: "🐼", stickers: ["rocket"], sessions: [{ date: "2026-10-09", slot: "evening" }] },
        { id: "premoteZoe", name: "Zoé", avatar: "🐰", stickers: ["bee"], sessions: [] },
      ]),
    );
    expect(screen.getByText("Qui est qui ?")).toBeInTheDocument();
    expect(screen.getByLabelText("lea correspond à")).toHaveValue(`local:${leaId}`);
    expect(screen.getByLabelText("Zoé correspond à")).toHaveValue("add");

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("+1 brossage, +1 autocollant")).toBeInTheDocument();
    expect(screen.getByText("nouveau")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fusionner" }));
    expect(screen.getByText("✓ Synchronisé")).toBeInTheDocument();
    expect(screen.getByText(/À votre tour/)).toBeInTheDocument();
    // The fresh install's unnamed default profile, Léa (matched, local name kept), Zoé (added).
    expect(listProfiles().map((p) => p.name)).toEqual(["", "Léa", "Zoé"]);
    const lea = listProfiles().find((p) => p.name === "Léa")!;
    expect(getProfile(lea.id).stickers.sort()).toEqual(["rocket", "unicorn"]);
    expect(listProfiles().some((p) => p.name === "Zoé")).toBe(true);
  });

  it("already-paired phones go straight to the preview", () => {
    const code = otherPhone(
      listProfiles().map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, stickers: ["lion"], sessions: [] })),
    );
    render(<SyncScreen onBack={() => {}} />);
    paste(code);
    expect(screen.queryByText("Qui est qui ?")).not.toBeInTheDocument();
    expect(screen.getByText("Ce qui va être ajouté")).toBeInTheDocument();
  });

  it("refuses an invalid code and changes nothing", () => {
    const before = localStorage.getItem("brosse-brille:progress:v2");
    render(<SyncScreen onBack={() => {}} />);
    paste("https://example.com");
    expect(screen.getByRole("alert")).toHaveTextContent("ne vient pas de Brosse & Brille");
    expect(localStorage.getItem("brosse-brille:progress:v2")).toBe(before);
  });

  it("cancel on the preview changes nothing", () => {
    const before = JSON.stringify(listProfiles());
    render(<SyncScreen onBack={() => {}} />);
    paste(otherPhone([{ id: "px", name: "Zoé", avatar: "🐰", stickers: [], sessions: [] }]));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(JSON.stringify(listProfiles())).toBe(before);
  });

  it("parents area opens the sync screen", () => {
    const onSync = vi.fn();
    render(<ParentsScreen onBack={() => {}} onSync={onSync} />);
    fireEvent.click(screen.getByRole("button", { name: "Synchroniser avec un autre téléphone" }));
    expect(onSync).toHaveBeenCalled();
  });
});
