import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import BrushingScreen from "./BrushingScreen";

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
};

describe("BrushingScreen", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    setVisibility("visible");
  });

  it("counts down from 3:00", () => {
    render(<BrushingScreen onComplete={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("3:00")).toBeInTheDocument();
    advance(5000);
    expect(screen.getByText("2:55")).toBeInTheDocument();
  });

  it("freezes time while paused and resumes where it left off", () => {
    render(<BrushingScreen onComplete={() => {}} onCancel={() => {}} />);
    advance(5000);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    advance(10000);
    expect(screen.getByText("2:55")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuer/ }));
    advance(5000);
    expect(screen.getByText("2:50")).toBeInTheDocument();
  });

  it("asks before quitting: ✕ pauses, only 'Arrêter' cancels", () => {
    const onCancel = vi.fn();
    render(<BrushingScreen onComplete={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Arrêter" }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // The dialog's own "Arrêter" button is the second one now on screen.
    const stopButtons = screen.getAllByRole("button", { name: "Arrêter" });
    fireEvent.click(stopButtons[stopButtons.length - 1]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("auto-pauses when the app goes to the background", () => {
    render(<BrushingScreen onComplete={() => {}} onCancel={() => {}} />);
    advance(3000);
    setVisibility("hidden");
    advance(20000);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("2:57")).toBeInTheDocument();
  });

  it("completes exactly once after 3 minutes", () => {
    const onComplete = vi.fn();
    render(<BrushingScreen onComplete={onComplete} onCancel={() => {}} />);
    advance(179000);
    expect(onComplete).not.toHaveBeenCalled();
    advance(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
