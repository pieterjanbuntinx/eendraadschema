import { ElectroItemZoeker } from "./ElectroItemZoeker";
import { SVGSymbols } from "../SVGSymbols";
import { htmlspecialchars } from "../general";
import { SituationPlanView_ElementPropertiesPopup } from "./SituationPlanView_ElementPropertiesPopup";

/**
 * Zijbalk links van het situatieschema ("Snel toevoegen").
 *
 * - Tab "Symbool": kies een kring en voeg de elementen van die kring met één klik toe.
 * - Tab "Bord": idem voor de borden.
 *
 * Per element wordt getoond hoeveel keer het al op het situatieschema staat t.o.v. het maximum.
 * Met het muiswiel boven de kringkeuze kan je naar de vorige/volgende kring zonder de lijst open te klikken.
 */

const SIDEBAR_WIDTH = 300;

type Modus = 'symbool' | 'bord';

export class SituationPlanView_SideBar {

    private div: HTMLElement | null;
    private modus: Modus = 'symbool';
    private kring: string | null = null;

    constructor(div: HTMLElement | null) {
        this.div = div;
        document.documentElement.style.setProperty('--sideBarWidth', SIDEBAR_WIDTH + 'px');
    }

    // -- Bewaren en terugzetten van de keuzes bij undo/redo --

    public getUndoRedoOptions() {
        return { sideBarModus: this.modus, sideBarKring: this.kring };
    }

    public setUndoRedoOptions(options: any) {
        if (options == null) return;
        if (options.sideBarModus === 'symbool' || options.sideBarModus === 'bord') this.modus = options.sideBarModus;
        if (options.sideBarKring !== undefined) this.kring = options.sideBarKring;
        this.render();
    }

    // -- Hulpfuncties --

    private get view() {
        return globalThis.structure?.sitplanview;
    }

    /** Teken het symbool van een element zoals het op het situatieschema komt, als klein icoon. */
    private symboolSVG(id: number): string {
        const item = globalThis.structure.getElectroItemById(id);
        if (item == null) return '';
        let svg;
        try { svg = item.toSVG(true, false); } catch (e) { return ''; }
        if (svg == null) return '';
        const sizex = svg.xleft + svg.xright + 10;
        const sizey = svg.yup + svg.ydown;
        if (!(sizex > 0) || !(sizey > 0)) return '';
        const data = String(svg.data).replace(/xlink:href="#/g, 'xlink:href="#SB_').replace(/href="#(?!SB_)/g, 'href="#SB_');
        return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${sizex} ${sizey}" preserveAspectRatio="xMidYMid meet">${data}</svg>`;
    }

    private aantalOpPlan(id: number): number {
        const sitplan = globalThis.structure.sitplan;
        if (sitplan == null || sitplan.countByElectroItemId == null) return 0;
        return sitplan.countByElectroItemId(id);
    }

    private maxOpPlan(id: number): number {
        const item = globalThis.structure.getElectroItemById(id);
        if (item == null || item.maxSituationPlanElements == null) return 1;
        return Number(item.maxSituationPlanElements()) || 1;
    }

    /** Voeg een element onmiddellijk toe, centraal in het zichtbare deel van het blad. */
    private voegToe(id: number) {
        const view = this.view;
        if (view == null) return;
        view.contextMenu?.hide();
        const canvas = document.getElementById('canvas');
        let posx = null, posy = null;
        if (canvas != null) {
            const p = view.canvasPosToPaperPos(canvas.clientWidth / 2, canvas.clientHeight / 2);
            posx = p.x; posy = p.y;
        }
        const d = globalThis.structure.sitplan.defaults;
        view.addElectroItem(id, 'auto', '', 'rechts', d.fontsize, d.scale, d.rotate, posx, posy);
    }

    /** Open het venster met alle instellingen, met dit element al ingevuld. */
    private voegToeMetInstellingen(id: number) {
        const view = this.view;
        if (view == null) return;
        view.contextMenu?.hide();
        view.unattachArrowKeys?.();
        SituationPlanView_ElementPropertiesPopup(
            null,
            (electroid, adrestype, adres, adreslocation, labelfontsize, scale, rotate, color) => {
                view.attachArrowKeys?.();
                view.addElectroItem(electroid, adrestype as any, adres, adreslocation as any, labelfontsize, scale, rotate, null, null, { undoStore: true, color });
            },
            () => { view.attachArrowKeys?.(); });
        const input = document.getElementById('electroItemIdInput') as HTMLInputElement | null;
        if (input != null) {
            input.value = String(id);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // -- Tekenen --

    public renderSymbols() {
        this.render();
    }

    public render() {
        if (this.div == null) this.div = document.getElementById('sidebar');
        if (this.div == null || globalThis.structure == null) return;

        const zoeker = new ElectroItemZoeker();
        const kringen = zoeker.getUniqueKringnaam().sort((a, b) => {
            if (a === 'Zonder naam') return 1;
            if (b === 'Zonder naam') return -1;
            return a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' });
        });
        if (this.kring == null || !kringen.includes(this.kring)) this.kring = (kringen.length > 0 ? kringen[0] : null);

        let lijst: { id: number, label: string }[] = [];
        if (this.modus === 'symbool') {
            if (this.kring != null) {
                lijst = zoeker.getElectroItemsByKring(this.kring).map(x => ({
                    id: x.id,
                    label: (x.adres && x.adres.trim() !== '' ? x.adres + ' - ' : '') + x.type
                }));
            }
        } else {
            lijst = zoeker.getBorden().map(b => ({ id: b.id, label: b.naam }));
        }

        // Symbolen tekenen; de definities worden één keer gedeeld (met prefix SB_)
        SVGSymbols.clearSymbols();
        const iconen = lijst.map(x => this.symboolSVG(x.id));
        const defs = SVGSymbols.getNeededSymbols(true);

        let html = `<svg width="0" height="0" style="position:absolute" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${defs}</svg>`;
        html += `<div class="sb-titel">Snel toevoegen</div>`;
        html += `<div class="sb-tabs">
                    <button class="sb-tab${this.modus === 'symbool' ? ' actief' : ''}" data-modus="symbool">Symbool</button>
                    <button class="sb-tab${this.modus === 'bord' ? ' actief' : ''}" data-modus="bord">Bord</button>
                 </div>`;

        if (this.modus === 'symbool') {
            html += `<div class="sb-kring"><label for="sb_kringselect">Kring:</label>
                     <select id="sb_kringselect" title="Tip: scroll met het muiswiel om van kring te wisselen">`;
            for (const k of kringen) {
                html += `<option value="${htmlspecialchars(k)}"${k === this.kring ? ' selected' : ''}>${htmlspecialchars(k)}</option>`;
            }
            html += `</select></div>`;
        }

        if (lijst.length === 0) {
            html += `<div class="sb-leeg">${this.modus === 'symbool' ? 'Geen symbolen gevonden.' : 'Geen borden gevonden.'}</div>`;
        }

        html += `<div class="sb-lijst">`;
        lijst.forEach((x, i) => {
            const n = this.aantalOpPlan(x.id);
            const max = this.maxOpPlan(x.id);
            const vol = n >= max;
            html += `<div class="sb-rij${vol ? ' vol' : ''}">
                        <div class="sb-label" title="${htmlspecialchars(x.label)}">${htmlspecialchars(x.label)}</div>
                        <div class="sb-icoon">${iconen[i]}</div>
                        <div class="sb-teller" title="Aantal keer op het situatieschema / maximum">${n}/${max}</div>
                        <button class="sb-knop sb-instellingen" data-id="${x.id}" title="Toevoegen met instellingen">&#9881;</button>
                        <button class="sb-knop sb-toevoegen" data-id="${x.id}" title="Toevoegen aan deze pagina">&#10148;</button>
                     </div>`;
        });
        html += `</div>`;

        this.div.innerHTML = html;

        // -- Acties --

        this.div.querySelectorAll<HTMLButtonElement>('.sb-tab').forEach(b => {
            b.onclick = () => { this.modus = b.dataset.modus as Modus; this.render(); };
        });
        this.div.querySelectorAll<HTMLButtonElement>('.sb-toevoegen').forEach(b => {
            b.onclick = () => this.voegToe(Number(b.dataset.id));
        });
        this.div.querySelectorAll<HTMLButtonElement>('.sb-instellingen').forEach(b => {
            b.onclick = () => this.voegToeMetInstellingen(Number(b.dataset.id));
        });

        const select = this.div.querySelector('#sb_kringselect') as HTMLSelectElement | null;
        if (select != null) {
            select.onchange = () => { this.kring = select.value; this.render(); };
            koppelScrollwielAanSelect(select);
        }
    }

}

/**
 * Laat toe om met het muiswiel door de opties van een keuzelijst te gaan terwijl de muis erboven staat,
 * zonder de lijst open te klikken. Bij een wijziging wordt een gewoon "change"-event gestuurd.
 */
export function koppelScrollwielAanSelect(select: HTMLSelectElement) {
    let opgestapeld = 0;
    select.addEventListener('wheel', (e: WheelEvent) => {
        if (select.disabled || select.options.length === 0) return;
        e.preventDefault();
        // Touchpads geven veel kleine stapjes; tel ze op tot een volledige "klik"
        opgestapeld += (e.deltaMode === 0 ? e.deltaY : e.deltaY * 40);
        if (Math.abs(opgestapeld) < 40) return;
        const stap = (opgestapeld > 0 ? 1 : -1);
        opgestapeld = 0;
        const nieuw = Math.min(select.options.length - 1, Math.max(0, select.selectedIndex + stap));
        if (nieuw === select.selectedIndex) return;
        select.selectedIndex = nieuw;
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }, { passive: false });
}

globalThis.HLInsertAndEditSymbol = (event: MouseEvent, id: number) => {}

globalThis.HLExpandSitPlan = (my_id: number) => {}
