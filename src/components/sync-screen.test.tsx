import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SyncScreen from "./SyncScreen";
import ParentsScreen from "./ParentsScreen";
import { addProfile, getProfile, listProfiles, recordSession, replaceProgress, type ProgressData } from "@/lib/progress";
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

  it("first sync: match by name, the new child takes over the empty 'Moi' profile, preview, merge, then show the updated code", async () => {
    render(<SyncScreen onBack={() => {}} />);
    paste(
      otherPhone([
        { id: "premoteLea", name: "lea", avatar: "🐼", stickers: ["rocket"], sessions: [{ date: "2026-10-09", slot: "evening" }] },
        { id: "premoteZoe", name: "Zoé", avatar: "🐰", stickers: ["bee"], sessions: [] },
      ]),
    );
    expect(screen.getByText("Qui est qui ?")).toBeInTheDocument();
    expect(screen.getByLabelText("lea correspond à")).toHaveValue(`local:${leaId}`);
    const placeholderId = listProfiles().find((p) => !p.name)!.id; // fresh install's empty "Moi"
    expect(screen.getByLabelText("Zoé correspond à")).toHaveValue(`local:${placeholderId}`);

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("+1 brossage, +1 autocollant")).toBeInTheDocument();
    expect(screen.getByText("nouveau")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fusionner" }));
    expect(screen.getByText("✓ Synchronisé")).toBeInTheDocument();
    expect(screen.getByText(/À votre tour/)).toBeInTheDocument();
    // The empty "Moi" became Zoé (name + avatar from the other phone); Léa matched, local name kept. No leftover "Moi".
    expect(listProfiles().map((p) => p.name)).toEqual(["Zoé", "Léa"]);
    expect(getProfile(listProfiles().find((p) => p.name === "Zoé")!.id).stickers).toEqual(["bee"]);
    const lea = listProfiles().find((p) => p.name === "Léa")!;
    expect(getProfile(lea.id).stickers.sort()).toEqual(["rocket", "unicorn"]);
    expect(listProfiles().some((p) => p.name === "Zoé")).toBe(true);
  });

  it("ignoring a child keeps this phone's stickers and says nothing is removed", () => {
    render(<SyncScreen onBack={() => {}} />);
    paste(otherPhone([{ id: "premoteLea", name: "lea", avatar: "🐼", stickers: ["rocket", "lion"], sessions: [] }]));
    fireEvent.change(screen.getByLabelText("lea correspond à"), { target: { value: "ignore" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByText("ignoré · rien n'est retiré ici")).toBeInTheDocument();
    expect(screen.getByText(/aucun autocollant ni brossage n'est jamais retiré/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fusionner" }));
    expect(getProfile(leaId).stickers).toEqual(["unicorn"]); // untouched
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

  it("parents area: repair card folds a 'Moi' holding Léa's stickers into Léa, losing nothing", () => {
    replaceProgress({
      version: 2,
      profiles: [{ id: "pMoi", name: "", avatar: "🐸" }, { id: "pLea", name: "Léa", avatar: "🦊" }],
      data: { pMoi: { sessions: [], stickers: ["unicorn", "rocket"] }, pLea: { sessions: [], stickers: [] } },
      active: ["pLea"],
    });
    render(<ParentsScreen onBack={() => {}} onSync={() => {}} />);
    expect(screen.getByText(/« Moi » contient 2 autocollants/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /C'est 🦊 Léa/ }));
    expect(listProfiles().map((p) => p.name)).toEqual(["Léa"]);
    expect(getProfile("pLea").stickers.sort()).toEqual(["rocket", "unicorn"]);
    expect(screen.queryByRole("region", { name: "Profil en double" })).not.toBeInTheDocument();
  });
});
