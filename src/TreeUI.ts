/**
 * Bediening van de boomstructuur links:
 *  - element-picker met categorieën om het type van een element te kiezen
 *  - "⋯"-menu per element (verschuiven, elders in het schema hangen, dupliceren)
 *  - weergavemodi: horizontaal uitgebreid of ingeklapt (compact), alles in- of uitklappen
 *  - versleepbare scheiding tussen de boomstructuur en de tekening
 */

import { Electro_Item } from "./List_Item/Electro_Item";
import { isFirefox } from "./general";

// ---------------------------------------------------------------------------------------------
// Categorieën voor de element-picker

const CATEGORIEEN: Array<{ naam: string, icoon: string, types: string[] }> = [
    { naam: "Structuurelementen", icoon: "▦", types: ["Elektriciteitsmeter", "Aansluiting", "Bord", "Kring", "Meerdere verbruikers", "Splitsing", "Klemmenstrook", "Leiding", "Zekering/differentieel", "Overspanningsbeveiliging", "Aansluitpunt", "Aftakdoos", "Vrije ruimte"] },
    { naam: "Verbruikers", icoon: "⏻", types: ["Boiler", "Contactdoos", "Diepvriezer", "Droogkast", "Elektrische oven", "Ketel", "Koelkast", "Kookfornuis", "Microgolfoven", "Motor", "Stoomoven", "Vaatwasmachine", "Verlenging", "Verwarmingstoestel", "Verbruiker", "Warmtepomp/airco", "Wasmachine"] },
    { naam: "Schakelaars en lichtpunten", icoon: "✱", types: ["Drukknop", "Lichtcircuit", "Lichtpunt", "Modulaire schakelaar", "Schakelaars"] },
    { naam: "Zonnepanelen en batterijen", icoon: "☀", types: ["Batterij", "Zonnepaneel", "EV lader", "Omvormer", "Omschakelaar"] },
    { naam: "Domotica", icoon: "⌂", types: ["Domotica", "Domotica module (verticaal)", "Domotica gestuurde verbruiker"] },
    { naam: "Media", icoon: "♪", types: ["Media", "USB lader"] },
    { naam: "Overige", icoon: "?", types: ["Bel", "Detector", "Transformator", "Ventilator", "Zeldzame symbolen"] },
    { naam: "Tekst", icoon: "T", types: ["Vrije tekst"] }
];

const AANBEVOLEN: { [oudertype: string]: string[] } = {
    "": ["Aansluiting", "Kring", "Zekering/differentieel"],
    "Aansluiting": ["Bord", "Kring", "Splitsing"],
    "Bord": ["Kring", "Vrije ruimte"],
    "Kring": ["Contactdoos", "Drukknop", "Lichtcircuit", "Kring", "Lichtpunt", "Schakelaars", "Splitsing", "Klemmenstrook", "Verwarmingstoestel", "Verbruiker", "Bord"],
    "Splitsing": ["Kring"],
    "Klemmenstrook": ["Kring"],
    "Omvormer": ["Leiding", "Batterij", "Zonnepaneel"],
    "Omschakelaar": ["Leiding", "Batterij", "Zonnepaneel"],
    "Modulaire schakelaar": ["Lichtpunt", "Drukknop", "Lichtcircuit"],
    "Domotica gestuurde verbruiker": ["Lichtpunt", "Contactdoos", "Verbruiker"]
};

function toegestaneTypes(item: Electro_Item): string[] {
    const parent = item.getParent();
    const lijst = (parent == null) ? ["", "Aansluiting", "Zekering/differentieel", "Kring"] : parent.allowedChilds();
    return lijst.filter(t => (t !== "") && (t !== "---") && (t !== "-"));
}

// ---------------------------------------------------------------------------------------------
// Toestand

type Weergave = "verbose" | "condensed";

function leesWeergave(): Weergave {
    try { return (localStorage.getItem("eds_tree_view") === "condensed") ? "condensed" : "verbose"; } catch (e) { return "verbose"; }
}

export const TreeUI = {
    weergave: leesWeergave() as Weergave,
    geselecteerd: null as number | null,   // geselecteerd element in de compacte weergave
    verplaatsId: null as number | null,    // element dat elders in het schema gehangen wordt

    isCompact(): boolean { return this.weergave === "condensed"; }
};

// ---------------------------------------------------------------------------------------------
// Hulpfuncties voor de HTML in de boom

export function typeLabelHTML(item: Electro_Item): string {
    const type = item.getType();
    let stijl = "";
    switch (type) {
        case "Aansluiting": case "Bord": stijl = "background-color:#FFD580;"; break;
        case "Kring": case "Zekering/differentieel": case "Splitsing": case "Klemmenstrook": stijl = "background-color:#FFFFE0;"; break;
        case "Domotica": case "Domotica module (verticaal)": stijl = "background-color:lightgreen;"; break;
    }
    const tekst = (type == null || type === "") ? "Selecteer type &#9656;" : item.getTypeLabel();
    const titel = (TreeUI.verplaatsId !== null) ? "Hang het element hieronder" : "Type kiezen";
    return `<button class="eds-typelabel" style="${stijl}" title="${titel}" onclick="showElementPicker(event,${item.id})">${tekst}</button>`
         + `<button class="eds-iconbtn" title="Type kiezen" onclick="showElementPicker(event,${item.id})">&#128269;</button>`
         + `<button class="eds-iconbtn" title="Meer acties" onclick="showSettings(event,${item.id})">&#8943;</button>`;
}

export function boomToolbarHTML(): string {
    const v = TreeUI.weergave;
    let html = `<div class="eds-tree-toolbar">`
             + `<b style="color:#666">SCHEMA</b><span style="flex:1"></span>`
             + `<button class="eds-iconbtn" title="Alles uitklappen" onclick="HLExpandAll(true)">&#8862;</button>`
             + `<button class="eds-iconbtn" title="Alles inklappen" onclick="HLExpandAll(false)">&#8863;</button>`
             + `<button class="eds-iconbtn${v === 'verbose' ? ' active' : ''}" title="Horizontaal uitgebreid" onclick="HLSetTreeView('verbose')">&#9776;</button>`
             + `<button class="eds-iconbtn${v === 'condensed' ? ' active' : ''}" title="Horizontaal ingeklapt" onclick="HLSetTreeView('condensed')">&#8801;</button>`
             + `</div>`;
    if (TreeUI.verplaatsId !== null) {
        const item = globalThis.structure.getElectroItemById(TreeUI.verplaatsId);
        const naam = item ? item.getTypeLabel() : "";
        html += `<div class="eds-move-banner">Kies het element waaronder <b>${naam}</b> moet hangen: klik op het type-label van dat element. `
              + `<button onclick="HLMoveElementTo(0)">Bovenste niveau</button> <button onclick="HLCancelMove()">Annuleren</button></div>`;
    }
    return html;
}

export function compactPaneelHTML(): string {
    if (!TreeUI.isCompact()) return "";
    const id = TreeUI.geselecteerd;
    const item = (id == null) ? null : globalThis.structure.getElectroItemById(id);
    if (item == null) return `<div id="eds_props_panel" class="eds-props-panel"><i>Klik op een element om de eigenschappen te bewerken.</i></div>`;
    return `<div id="eds_props_panel" class="eds-props-panel"><div class="eds-props-title">${item.getTypeLabel()} (id: ${item.id})</div>${item.toHTML(globalThis.structure.mode)}</div>`;
}

export function vernieuwCompactPaneel() {
    if (!TreeUI.isCompact()) return;
    const div = document.getElementById("eds_props_panel");
    if (div == null) return;
    div.outerHTML = compactPaneelHTML();
}

// ---------------------------------------------------------------------------------------------
// Popups

function sluitPopups() {
    document.querySelectorAll(".eds-popup").forEach(e => e.remove());
}

function plaatsPopup(popup: HTMLElement, event: MouseEvent) {
    document.body.appendChild(popup);
    const r = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect?.() ?? { left: event.clientX, bottom: event.clientY } as DOMRect;
    let x = r.left, y = r.bottom + 2;
    const w = popup.offsetWidth, h = popup.offsetHeight;
    if (x + w > window.innerWidth - 8) x = Math.max(8, window.innerWidth - w - 8);
    if (y + h > window.innerHeight - 8) y = Math.max(8, window.innerHeight - h - 8);
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    setTimeout(() => {
        const sluit = (e: Event) => {
            if (!popup.contains(e.target as Node)) { popup.remove(); document.removeEventListener("mousedown", sluit); document.removeEventListener("keydown", esc); }
        };
        const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { popup.remove(); document.removeEventListener("mousedown", sluit); document.removeEventListener("keydown", esc); } };
        document.addEventListener("mousedown", sluit);
        document.addEventListener("keydown", esc);
    }, 0);
}

function herteken(parentId: number | null, id: number) {
    globalThis.undostruct.store();
    if (TreeUI.isCompact() || isFirefox() || parentId === null) {
        globalThis.HLRedrawTree();
    } else {
        globalThis.structure.reNumber();
        globalThis.structure.updateHTMLinner(parentId);
        globalThis.HLRedrawTreeSVG();
    }
    void id;
}

// ---------------------------------------------------------------------------------------------
// Globale functies (aangeroepen vanuit de HTML)

globalThis.showElementPicker = (event: MouseEvent, id: number) => {
    event.stopPropagation();
    sluitPopups();

    // Tijdens het verplaatsen dient een klik op een label om de nieuwe ouder te kiezen
    if (TreeUI.verplaatsId !== null) { globalThis.HLMoveElementTo(id); return; }

    const item = globalThis.structure.getElectroItemById(id) as Electro_Item | null;
    if (item == null) return;

    const toegestaan = toegestaneTypes(item);
    const parent = item.getParent();
    const aanbevolen = (AANBEVOLEN[parent ? parent.getType() : ""] ?? toegestaan.slice(0, 10)).filter(t => toegestaan.includes(t));

    const secties: Array<{ naam: string, icoon: string, types: string[] }> = [];
    if (aanbevolen.length) secties.push({ naam: "Aanbevolen", icoon: "★", types: aanbevolen });
    for (const c of CATEGORIEEN) {
        const types = c.types.filter(t => toegestaan.includes(t));
        if (types.length) secties.push({ naam: c.naam, icoon: c.icoon, types });
    }
    secties.push({ naam: "Alle elementen", icoon: "⊞", types: [...toegestaan].sort((a, b) => a.localeCompare(b)) });

    const popup = document.createElement("div");
    popup.className = "eds-popup eds-picker";
    popup.innerHTML = `<div class="eds-picker-side"></div><div class="eds-picker-main"></div>`;
    const side = popup.querySelector(".eds-picker-side") as HTMLElement;
    const main = popup.querySelector(".eds-picker-main") as HTMLElement;

    const toon = (index: number) => {
        side.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === index));
        const s = secties[index];
        main.innerHTML = `<div class="eds-picker-title">${s.naam}</div>`
                       + s.types.map(t => `<div class="eds-picker-item${t === item.getType() ? ' current' : ''}" data-type="${t}">${t}</div>`).join("");
        main.querySelectorAll(".eds-picker-item").forEach(el => {
            el.addEventListener("click", () => {
                popup.remove();
                globalThis.HLSetType(id, (el as HTMLElement).dataset.type as string);
            });
        });
    };
    secties.forEach((s, i) => {
        const b = document.createElement("button");
        b.title = s.naam;
        b.textContent = s.icoon;
        b.addEventListener("mouseenter", () => toon(i));
        b.addEventListener("click", () => toon(i));
        side.appendChild(b);
    });
    toon(0);
    plaatsPopup(popup, event);
};

globalThis.HLSetType = (id: number, type: string) => {
    const item = globalThis.structure.getElectroItemById(id);
    if (item == null) return;
    if (item.getType() === type) return;
    globalThis.structure.adjustTypeById(id, type);
    globalThis.structure.reNumber();
    if (item.getType() === "Domotica gestuurde verbruiker" || type === "Domotica gestuurde verbruiker") globalThis.structure.voegAttributenToeAlsNodigEnReSort();
    const parent = item.getParent();
    herteken(parent ? parent.id : null, id);
};

globalThis.showSettings = (event: MouseEvent, id: number) => {
    event.stopPropagation();
    sluitPopups();
    const structure = globalThis.structure;
    const item = structure.getElectroItemById(id) as Electro_Item | null;
    if (item == null) return;

    // Kan het element naar boven of beneden binnen hetzelfde niveau?
    const ordinal = structure.getOrdinalById(id);
    let kanOp = false, kanNeer = false;
    if (ordinal !== null) {
        for (let i = 0; i < structure.length; i++) {
            if (!structure.active[i] || structure.data[i].parent !== item.parent) continue;
            if ((structure.data[i] as Electro_Item).isAttribuut()) continue;
            if (i < ordinal) kanOp = true;
            if (i > ordinal) kanNeer = true;
        }
    }

    const acties: Array<[string, () => void]> = [];
    if (kanOp) acties.push(["&#9650; Naar boven schuiven", () => globalThis.HLMoveUp(id)]);
    if (kanNeer) acties.push(["&#9660; Naar beneden schuiven", () => globalThis.HLMoveDown(id)]);
    acties.push(["&#128279; Elders in schema hangen", () => globalThis.HLMoveElement(id)]);
    if (item.checkInsertSibling()) acties.push(["&#10064; Dupliceren", () => globalThis.HLClone(id)]);

    const popup = document.createElement("div");
    popup.className = "eds-popup eds-menu";
    for (const [label, actie] of acties) {
        const d = document.createElement("div");
        d.className = "eds-menu-item";
        d.innerHTML = label;
        d.addEventListener("click", () => { popup.remove(); actie(); });
        popup.appendChild(d);
    }
    plaatsPopup(popup, event);
};

globalThis.HLMoveElement = (id: number) => {
    TreeUI.verplaatsId = id;
    globalThis.HLRedrawTreeHTML();
};

globalThis.HLCancelMove = () => {
    TreeUI.verplaatsId = null;
    globalThis.HLRedrawTreeHTML();
};

globalThis.HLMoveElementTo = (nieuweOuderId: number) => {
    const structure = globalThis.structure;
    const id = TreeUI.verplaatsId;
    if (id === null) return;
    const item = structure.getElectroItemById(id) as Electro_Item | null;
    if (item == null) { TreeUI.verplaatsId = null; return; }

    if (nieuweOuderId === id) { alert("Een element kan niet onder zichzelf gehangen worden."); return; }

    if (nieuweOuderId !== 0) {
        // Circulaire referentie vermijden
        let p = nieuweOuderId;
        while (p !== 0) {
            const ouder = structure.getElectroItemById(p);
            if (ouder == null) break;
            if (ouder.id === id) { alert("Circulaire referentie. Nieuwe ouder kan geen afstammeling van het te verplaatsen element zijn."); return; }
            p = ouder.parent;
        }
        const nieuweOuder = structure.getElectroItemById(nieuweOuderId) as Electro_Item | null;
        if (nieuweOuder == null) return;
        if ((item.getType() !== "") && !nieuweOuder.allowedChilds().includes(item.getType())) {
            alert(`Dat is geen geldig ouder-object. Een "${item.getType()}" kan niet onder een "${nieuweOuder.getType()}" hangen.`);
            return;
        }
        if (nieuweOuder.getNumChilds() >= nieuweOuder.getMaxNumChilds() && item.parent !== nieuweOuderId) {
            alert(`Het maximum aantal kinderen van dit element is ${nieuweOuder.getMaxNumChilds()}.`);
            return;
        }
    } else if (!["", "Aansluiting", "Zekering/differentieel", "Kring"].includes(item.getType())) {
        alert(`Een "${item.getType()}" kan niet op het bovenste niveau staan.`);
        return;
    }

    const ordinal = structure.getOrdinalById(id);
    if (ordinal !== null) structure.data[ordinal].parent = nieuweOuderId;
    TreeUI.verplaatsId = null;
    structure.reSort();
    structure.reNumber();
    globalThis.undostruct.store();
    globalThis.HLRedrawTree();
};

globalThis.HLSetTreeView = (weergave: Weergave) => {
    TreeUI.weergave = weergave;
    try { localStorage.setItem("eds_tree_view", weergave); } catch (e) { /* geen opslag beschikbaar */ }
    globalThis.HLRedrawTreeHTML();
};

globalThis.HLExpandAll = (uitklappen: boolean) => {
    const structure = globalThis.structure;
    for (let i = 0; i < structure.length; i++) {
        if (structure.active[i]) structure.data[i].collapsed = !uitklappen;
    }
    globalThis.undostruct.store();
    globalThis.HLRedrawTree();
};

globalThis.HLSelectRow = (event: MouseEvent, id: number) => {
    if (!TreeUI.isCompact()) return;
    event.stopPropagation();
    const doel = event.target as HTMLElement;
    if (doel.closest("button, input, select, textarea")) return; // klikken op knoppen niet onderscheppen
    if (TreeUI.verplaatsId !== null) { globalThis.HLMoveElementTo(id); return; }
    TreeUI.geselecteerd = id;
    globalThis.HLRedrawTreeHTML();
};

// ---------------------------------------------------------------------------------------------
// Versleepbare scheiding tussen boom en tekening

export function installeerKolomScheiding() {
    const links = document.getElementById("left_col");
    const rechts = document.getElementById("right_col");
    if (!links || !rechts || document.getElementById("col_resizer")) return;

    const scheiding = document.createElement("div");
    scheiding.id = "col_resizer";
    scheiding.title = "Sleep om de breedte aan te passen";
    links.after(scheiding);

    const zet = (fractie: number) => {
        fractie = Math.min(0.85, Math.max(0.15, fractie));
        links.style.flex = `0 0 ${fractie * 100}%`;
        rechts.style.flex = "1 1 0";
    };
    try { const f = parseFloat(localStorage.getItem("eds_col_split") ?? ""); if (!isNaN(f)) zet(f); } catch (e) { /* negeren */ }

    scheiding.addEventListener("mousedown", (e: MouseEvent) => {
        e.preventDefault();
        const ouder = links.parentElement as HTMLElement;
        const beweeg = (ev: MouseEvent) => {
            const r = ouder.getBoundingClientRect();
            zet((ev.clientX - r.left) / r.width);
        };
        const stop = () => {
            document.removeEventListener("mousemove", beweeg);
            document.removeEventListener("mouseup", stop);
            const r = ouder.getBoundingClientRect();
            try { localStorage.setItem("eds_col_split", String(links.getBoundingClientRect().width / r.width)); } catch (e) { /* negeren */ }
        };
        document.addEventListener("mousemove", beweeg);
        document.addEventListener("mouseup", stop);
    });
}
