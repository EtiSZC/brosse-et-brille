import { Capacitor } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

/** Android app: Google's ML Kit scanner. Browser / PWA (iPhone): the in-page camera scanner. */
export const usesNativeScanner = () => Capacitor.isNativePlatform();

/** A camera scanner is available (otherwise only "Coller un code"). */
export const canScan = () =>
  usesNativeScanner() || (typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);

export class ScannerNotReady extends Error {}

/**
 * Opens Google's code scanner (no camera permission needed) and returns the QR text,
 * or null if the parent cancelled. The scanner module is pre-downloaded at install
 * time (AndroidManifest `barcode_ui`); if it isn't there yet, ask to retry.
 */
export async function scanQr(): Promise<string | null> {
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule().catch(() => {});
    throw new ScannerNotReady(
      "Le lecteur de QR code s'installe (connexion internet nécessaire la première fois). Réessayez dans un instant.",
    );
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
    return barcodes[0]?.rawValue ?? null;
  } catch {
    return null; // cancelled
  }
}
