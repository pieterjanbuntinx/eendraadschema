import { EDStoStructure } from "./importExport/importExport";
import { gevraagdeWeergave } from "./VensterSync";

/**
 * Integration with the Electron desktop app (see /desktop).
 *
 * When the app runs inside Electron, the preload script exposes `window.edsDesktop`.
 * It lets the main process hand over .eds files that were opened from the file
 * system (double click, "Open with", drag onto the app icon).
 * In a normal browser `window.edsDesktop` does not exist and nothing happens here.
 */

interface DesktopBridge {
    isDesktop: boolean;
    getPendingFile(): Promise<{ name: string, text: string } | null>;
    onOpenFile(callback: (file: { name: string, text: string }) => void): void;
}

function openFile(file: { name: string, text: string } | null) {
    if (file == null || typeof file.text !== "string" || file.text === "") return;
    EDStoStructure(file.text);
    if (globalThis.structure.sitplan) globalThis.structure.sitplan.activePage = 1;
    if (file.name) {
        globalThis.structure.properties.filename = file.name;
        if (globalThis.fileAPIobj) globalThis.fileAPIobj.filename = file.name;
    }
}

/** Call once at the end of the start-up sequence (after the autosave was restored). */
export async function initDesktopIntegration() {
    const bridge = (window as any).edsDesktop as DesktopBridge | undefined;
    if (bridge == null || !bridge.isDesktop) return;

    // Linked windows (?venster=...) take their data from the main window, never from a file
    if (gevraagdeWeergave() != null) return;

    bridge.onOpenFile(openFile);
    try {
        openFile(await bridge.getPendingFile());
    } catch (e) {
        console.error("Desktop: could not open the requested file", e);
    }
}
