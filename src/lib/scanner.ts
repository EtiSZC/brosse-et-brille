import { Capacitor } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

/** The camera scanner only exists in the Android app (the browser uses "Coller un code"). */
export const canScan = () => Capacitor.isNativePlatform();

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
