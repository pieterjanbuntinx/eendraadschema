import { loadFromText } from "./importExport/importExport";
import { showSituationPlanPage } from "./sitplan/SituationPlanView";

/**
 * Synchronisatie tussen meerdere vensters/tabbladen van de app.
 *
 * Zo kan je bijvoorbeeld het ééndraadschema in het ene venster en het situatieschema in een ander venster
 * (op een tweede scherm) open hebben. Elke wijziging in het ene venster wordt naar de andere vensters gestuurd
 * via een BroadcastChannel (enkel binnen dezelfde browser en dezelfde website).
 */

type Weergave = '2col' | 'draw' | 'config';

const KANAAL = 'eendraadschema-vensters';
const vensterId = Math.random().toString(36).slice(2) + Date.now().toString(36);

let kanaal: BroadcastChannel | null = null;
const anderen = new Set<string>();
let bezigMetOntvangen = false;
let zendTimer: number | null = null;
let wachtOpStatus: ((ok: boolean) => void) | null = null;
let laatsteTekst: string | null = null; // laatst verstuurde of ontvangen toestand, om dubbel werk te vermijden

/** Weergave gevraagd via de URL (?venster=draw of ?venster=2col), of null voor een gewoon venster. */
export function gevraagdeWeergave(): Weergave | null {
    try {
        const v = new URLSearchParams(window.location.search).get('venster');
        if (v === 'draw' || v === '2col') return v;
    } catch (e) { /* negeren */ }
    return null;
}

export function isGekoppeldVenster(): boolean {
    return gevraagdeWeergave() !== null;
}

/** Aantal andere open vensters van de app. */
export function aantalAndereVensters(): number {
    return anderen.size;
}

/** Open een nieuw venster met de gevraagde weergave, gekoppeld aan dit venster. */
export function openInNieuwVenster(weergave: '2col' | 'draw') {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('venster', weergave);
    const breedte = Math.min(1400, Math.max(900, Math.round(window.screen.availWidth * 0.6)));
    const hoogte = Math.min(1000, Math.max(700, Math.round(window.screen.availHeight * 0.85)));
    const w = window.open(url.toString(), 'eds_' + weergave + '_' + vensterId.slice(0, 6), `popup,width=${breedte},height=${hoogte}`);
    if (w == null) {
        alert('Het nieuwe venster kon niet geopend worden. Sta pop-ups toe voor deze website en probeer opnieuw.');
    }
}

function huidigeStatus(): string {
    return globalThis.structure.toJsonObject(false);
}

function zend(bericht: any) {
    if (kanaal == null) return;
    try { kanaal.postMessage({ ...bericht, van: vensterId }); } catch (e) { console.warn('VensterSync: versturen mislukt', e); }
}

/**
 * Roep aan na elke wijziging (undostruct.store, undo, redo). Stuurt de nieuwe toestand naar de andere vensters,
 * licht vertraagd zodat snel opeenvolgende wijzigingen samen verstuurd worden.
 */
export function meldWijziging() {
    if (kanaal == null || bezigMetOntvangen || anderen.size === 0) return;
    if (zendTimer != null) window.clearTimeout(zendTimer);
    zendTimer = window.setTimeout(() => {
        zendTimer = null;
        if (globalThis.structure == null) return;
        const tekst = huidigeStatus();
        if (tekst === laatsteTekst) return;
        laatsteTekst = tekst;
        zend({ soort: 'status', tekst: tekst });
    }, 150);
}

/** Bewaar wat in dit venster getoond wordt, laad de ontvangen toestand en toon opnieuw hetzelfde. */
function pasStatusToe(tekst: string) {
    const weergave = globalThis.structure.properties.currentView as Weergave;
    const view = globalThis.structure.sitplanview;
    const zicht = (view != null) ? {
        zoom: view.getZoomFactor ? view.getZoomFactor() : null,
        scrollLeft: document.getElementById('canvas')?.scrollLeft ?? 0,
        scrollTop: document.getElementById('canvas')?.scrollTop ?? 0,
        pagina: globalThis.structure.sitplan?.activePage ?? 1,
    } : null;
    const linksScroll = document.getElementById('left_col')?.scrollTop ?? 0;
    const rechtsScroll = document.getElementById('right_col')?.scrollTop ?? 0;
    const mode = globalThis.structure.mode;

    bezigMetOntvangen = true;
    try {
        loadFromText(tekst, 0, false);
        globalThis.structure.reSort();
        globalThis.structure.mode = mode;
        globalThis.structure.properties.currentView = weergave;
        if (zicht != null && globalThis.structure.sitplan != null) {
            const n = (globalThis.structure.sitplan as any).numPages ?? 1;
            globalThis.structure.sitplan.activePage = Math.min(zicht.pagina, n);
        }

        // Ook in dit venster een undo-stap maken
        globalThis.undostruct.store();

        switch (weergave) {
            case '2col':
                globalThis.HLRedrawTree();
                const l = document.getElementById('left_col'); if (l) l.scrollTop = linksScroll;
                const r = document.getElementById('right_col'); if (r) r.scrollTop = rechtsScroll;
                break;
            case 'draw':
                showSituationPlanPage();
                const nieuweView = globalThis.structure.sitplanview;
                if (zicht != null && nieuweView != null && zicht.zoom != null && nieuweView.setzoom) {
                    nieuweView.setzoom(zicht.zoom);
                    const c = document.getElementById('canvas');
                    if (c) { c.scrollLeft = zicht.scrollLeft; c.scrollTop = zicht.scrollTop; }
                }
                break;
            case 'config':
                // Bestand-, print- of documentatiepagina: niets hertekenen, de data is wel bijgewerkt.
                break;
        }
    } catch (e) {
        console.error('VensterSync: toepassen van ontvangen schema mislukt', e);
    } finally {
        bezigMetOntvangen = false;
    }
}

/**
 * Start de synchronisatie. Moet één keer opgeroepen worden bij het opstarten van de app.
 */
export function startVensterSync() {
    if (typeof BroadcastChannel === 'undefined') return;
    kanaal = new BroadcastChannel(KANAAL);

    kanaal.onmessage = (ev: MessageEvent) => {
        const b = ev.data;
        if (b == null || b.van === vensterId) return;
        switch (b.soort) {
            case 'hallo':
                anderen.add(b.van);
                zend({ soort: 'aanwezig', aan: b.van });
                break;
            case 'aanwezig':
                if (b.aan === vensterId) anderen.add(b.van);
                break;
            case 'weg':
                anderen.delete(b.van);
                break;
            case 'vraagStatus':
                anderen.add(b.van);
                if (wachtOpStatus == null && globalThis.structure != null) {
                    laatsteTekst = huidigeStatus();
                    zend({ soort: 'status', aan: b.van, tekst: laatsteTekst });
                }
                break;
            case 'status':
                if (b.aan != null && b.aan !== vensterId) break;
                anderen.add(b.van);
                if (b.tekst === laatsteTekst && wachtOpStatus == null) break;
                laatsteTekst = b.tekst;
                if (wachtOpStatus != null) {
                    // Eerste toestand voor een nieuw geopend venster
                    const klaar = wachtOpStatus;
                    wachtOpStatus = null;
                    bezigMetOntvangen = true;
                    try {
                        loadFromText(b.tekst, 0, false);
                        globalThis.structure.reSort();
                    } finally {
                        bezigMetOntvangen = false;
                    }
                    klaar(true);
                } else {
                    pasStatusToe(b.tekst);
                }
                break;
        }
    };

    window.addEventListener('beforeunload', () => zend({ soort: 'weg' }));
    zend({ soort: 'hallo' });
}

/**
 * Voor een gekoppeld venster: vraag de huidige toestand op bij een ander venster.
 * Geeft true terug als er een toestand ontvangen werd (binnen de wachttijd).
 */
export function haalStatusOp(wachttijd: number = 1500): Promise<boolean> {
    return new Promise(resolve => {
        if (kanaal == null) { resolve(false); return; }
        const timer = window.setTimeout(() => { wachtOpStatus = null; resolve(false); }, wachttijd);
        wachtOpStatus = (ok: boolean) => { window.clearTimeout(timer); resolve(ok); };
        zend({ soort: 'vraagStatus' });
    });
}
