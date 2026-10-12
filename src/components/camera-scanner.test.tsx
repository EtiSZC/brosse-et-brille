import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CameraScanner from "./CameraScanner";

vi.mock("jsqr", () => ({ default: vi.fn(() => null) }));

describe("camera scanner (browser)", () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).mediaDevices;
  });

  it("explains how to allow the camera when it is refused, and can be cancelled", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn(() => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }))) },
    });
    const onCancel = vi.fn();
    render(<CameraScanner onResult={() => {}} onCancel={onCancel} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Autorisez l'appareil photo"));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("asks for the back camera only (no microphone)", () => {
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => {}));
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    render(<CameraScanner onResult={() => {}} onCancel={() => {}} />);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" }, audio: false });
  });
});
