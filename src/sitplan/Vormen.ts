/**
 * Eenvoudige tekenvormen voor het situatieschema: lijn, rechthoek en ellips.
 *
 * Een vorm wordt bewaard als parameters (zie Vorm) in een SituationPlanElement. Daaruit wordt telkens een SVG
 * gegenereerd, zodat verplaatsen, roteren, selecteren, kopiëren en printen hetzelfde werken als bij andere elementen.
 * Een lijn wordt steeds horizontaal getekend; de richting zit in de rotatie van het element.
 */

export type VormSoort = 'lijn' | 'rechthoek' | 'ellips';
export type LijnStijl = 'vol' | 'streep' | 'punt';

export interface Vorm {
    soort: VormSoort;
    breedte: number;      // lengte voor een lijn
    hoogte: number;       // niet gebruikt voor een lijn
    lijndikte: number;
    kleur: string;
    vulling: string | null; // null = geen vulling
    hoekstraal: number;   // enkel rechthoek
    stijl: LijnStijl;
    pijlBegin: boolean;   // enkel lijn
    pijlEind: boolean;    // enkel lijn
}

export const VORM_LABELS: Record<VormSoort, string> = { lijn: 'Lijn', rechthoek: 'Rechthoek', ellips: 'Ellips' };

const OPSLAG_SLEUTEL = 'eds_vorm_stijl';

/** Laatst gebruikte stijl, zodat een volgende vorm er hetzelfde uitziet. */
export function laatsteStijl(): Pick<Vorm, 'lijndikte' | 'kleur' | 'vulling' | 'hoekstraal' | 'stijl'> {
    const standaard = { lijndikte: 2, kleur: '#000000', vulling: null as string | null, hoekstraal: 0, stijl: 'vol' as LijnStijl };
    try {
        const s = JSON.parse(localStorage.getItem(OPSLAG_SLEUTEL) ?? 'null');
        if (s != null && typeof s === 'object') return { ...standaard, ...s };
    } catch (e) { /* negeren */ }
    return standaard;
}

export function bewaarStijl(v: Vorm) {
    try {
        localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify({
            lijndikte: v.lijndikte, kleur: v.kleur, vulling: v.vulling, hoekstraal: v.hoekstraal, stijl: v.stijl
        }));
    } catch (e) { /* negeren */ }
}

export function nieuweVorm(soort: VormSoort, breedte: number, hoogte: number): Vorm {
    const s = laatsteStijl();
    return {
        soort, breedte, hoogte,
        lijndikte: s.lijndikte, kleur: s.kleur,
        vulling: (soort === 'lijn' ? null : s.vulling),
        hoekstraal: s.hoekstraal, stijl: s.stijl,
        pijlBegin: false, pijlEind: false,
    };
}

/** Controleert en verbetert waarden (bvb. na inlezen uit een bestand). */
export function normaliseerVorm(v: any): Vorm | null {
    if (v == null || typeof v !== 'object') return null;
    if (!['lijn', 'rechthoek', 'ellips'].includes(v.soort)) return null;
    const getal = (x: any, min: number, std: number) => { const n = Number(x); return (isFinite(n) && n >= min) ? n : std; };
    const kleur = (x: any, std: string | null) => (typeof x === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(x)) ? x : std;
    return {
        soort: v.soort,
        breedte: getal(v.breedte, 1, 100),
        hoogte: getal(v.hoogte, 1, 60),
        lijndikte: getal(v.lijndikte, 0.1, 2),
        kleur: kleur(v.kleur, '#000000') as string,
        vulling: kleur(v.vulling, null),
        hoekstraal: getal(v.hoekstraal, 0, 0),
        stijl: (['vol', 'streep', 'punt'].includes(v.stijl) ? v.stijl : 'vol'),
        pijlBegin: !!v.pijlBegin,
        pijlEind: !!v.pijlEind,
    };
}

function streepPatroon(v: Vorm): string {
    const lw = v.lijndikte;
    switch (v.stijl) {
        case 'streep': return ` stroke-dasharray="${+(lw * 4 + 4).toFixed(2)} ${+(lw * 2 + 3).toFixed(2)}"`;
        case 'punt': return ` stroke-dasharray="${+(lw).toFixed(2)} ${+(lw * 2 + 1).toFixed(2)}" stroke-linecap="round"`;
        default: return '';
    }
}

/** Grootte van de pijlpunt in functie van de lijndikte. */
function pijlMaat(lw: number) {
    return { lengte: Math.max(8, lw * 4), halfBreedte: Math.max(3.5, lw * 2) };
}

/**
 * Genereert de SVG van een vorm.
 * @returns svg-tekst en de afmetingen (sizex, sizey) van de figuur
 */
export function vormNaarSVG(v: Vorm): { svg: string, sizex: number, sizey: number } {
    const lw = v.lijndikte;
    const f = (n: number) => +n.toFixed(2);
    let inhoud = '';
    let sizex: number, sizey: number;

    if (v.soort === 'lijn') {
        const pm = pijlMaat(lw);
        const marge = Math.max(4, lw, (v.pijlBegin || v.pijlEind) ? pm.halfBreedte + 1 : 0);
        sizex = v.breedte + 2 * Math.max(2, lw / 2);
        sizey = 2 * marge;
        const y = sizey / 2;
        let x1 = (sizex - v.breedte) / 2;
        let x2 = x1 + v.breedte;
        const punten: string[] = [];
        // Pijlpunten als gevulde driehoeken (werkt ook bij exporteren naar PDF)
        if (v.pijlBegin) {
            punten.push(`<polygon points="${f(x1)},${f(y)} ${f(x1 + pm.lengte)},${f(y - pm.halfBreedte)} ${f(x1 + pm.lengte)},${f(y + pm.halfBreedte)}" fill="${v.kleur}" stroke="none" />`);
            x1 += pm.lengte * 0.8;
        }
        if (v.pijlEind) {
            punten.push(`<polygon points="${f(x2)},${f(y)} ${f(x2 - pm.lengte)},${f(y - pm.halfBreedte)} ${f(x2 - pm.lengte)},${f(y + pm.halfBreedte)}" fill="${v.kleur}" stroke="none" />`);
            x2 -= pm.lengte * 0.8;
        }
        if (x2 > x1) inhoud += `<line x1="${f(x1)}" y1="${f(y)}" x2="${f(x2)}" y2="${f(y)}" stroke="${v.kleur}" stroke-width="${lw}"${streepPatroon(v)} />`;
        inhoud += punten.join('');
    } else {
        sizex = v.breedte + lw;
        sizey = v.hoogte + lw;
        const vulling = (v.vulling != null ? v.vulling : 'none');
        if (v.soort === 'rechthoek') {
            const r = Math.min(v.hoekstraal, v.breedte / 2, v.hoogte / 2);
            inhoud = `<rect x="${f(lw / 2)}" y="${f(lw / 2)}" width="${f(v.breedte)}" height="${f(v.hoogte)}"` +
                     (r > 0 ? ` rx="${f(r)}" ry="${f(r)}"` : '') +
                     ` fill="${vulling}" stroke="${v.kleur}" stroke-width="${lw}"${streepPatroon(v)} />`;
        } else {
            inhoud = `<ellipse cx="${f(sizex / 2)}" cy="${f(sizey / 2)}" rx="${f(v.breedte / 2)}" ry="${f(v.hoogte / 2)}"` +
                     ` fill="${vulling}" stroke="${v.kleur}" stroke-width="${lw}"${streepPatroon(v)} />`;
        }
    }

    sizex = f(sizex); sizey = f(sizey);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sizex}" height="${sizey}" viewBox="0 0 ${sizex} ${sizey}">${inhoud}</svg>`;
    return { svg, sizex, sizey };
}

/**
 * Venster om de eigenschappen van een vorm te wijzigen. Wijzigingen worden onmiddellijk getoond (live),
 * bij "Annuleren" wordt alles teruggezet.
 *
 * @param vorm      huidige vorm (wordt niet rechtstreeks aangepast)
 * @param rotatie   huidige rotatie van het element in graden
 * @param voorbeeld wordt opgeroepen bij elke wijziging om het resultaat te tonen
 * @param klaar     wordt opgeroepen bij OK (true) of Annuleren (false)
 */
export function toonVormEigenschappen(vorm: Vorm, rotatie: number,
                                      voorbeeld: (v: Vorm, rotatie: number) => void,
                                      klaar: (ok: boolean, v: Vorm, rotatie: number) => void) {
    const origineel: Vorm = { ...vorm };
    const origRotatie = rotatie;
    const isLijn = vorm.soort === 'lijn';

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay vorm-overlay';
    overlay.style.visibility = 'visible';
    overlay.innerHTML = `
      <div class="popup vorm-popup">
        <h3>${VORM_LABELS[vorm.soort]} bewerken</h3>
        <table class="vorm-tabel">
          <tr><td>${isLijn ? 'Lengte' : 'Breedte'}</td><td><input type="number" id="vorm_breedte" min="1" step="1" value="${+vorm.breedte.toFixed(1)}"></td></tr>
          ${isLijn ? '' : `<tr><td>Hoogte</td><td><input type="number" id="vorm_hoogte" min="1" step="1" value="${+vorm.hoogte.toFixed(1)}"></td></tr>`}
          <tr><td>Rotatie (°)</td><td><input type="number" id="vorm_rotatie" step="1" value="${+(+rotatie).toFixed(1)}"></td></tr>
          <tr><td>Lijndikte</td><td><input type="number" id="vorm_lijndikte" min="0.1" max="50" step="0.5" value="${vorm.lijndikte}"></td></tr>
          <tr><td>Lijnkleur</td><td><input type="color" id="vorm_kleur" value="${vorm.kleur}"></td></tr>
          <tr><td>Lijnstijl</td><td><select id="vorm_stijl">
                <option value="vol"${vorm.stijl === 'vol' ? ' selected' : ''}>Volle lijn</option>
                <option value="streep"${vorm.stijl === 'streep' ? ' selected' : ''}>Streepjes</option>
                <option value="punt"${vorm.stijl === 'punt' ? ' selected' : ''}>Puntjes</option>
              </select></td></tr>
          ${isLijn ? `
          <tr><td>Pijlpunt</td><td>
                <label><input type="checkbox" id="vorm_pijlbegin"${vorm.pijlBegin ? ' checked' : ''}> begin</label>
                <label><input type="checkbox" id="vorm_pijleind"${vorm.pijlEind ? ' checked' : ''}> einde</label></td></tr>` : `
          <tr><td>Vulling</td><td>
                <label><input type="checkbox" id="vorm_vult"${vorm.vulling != null ? ' checked' : ''}> gevuld</label>
                <input type="color" id="vorm_vulling" value="${vorm.vulling ?? '#dddddd'}"></td></tr>`}
          ${vorm.soort === 'rechthoek' ? `<tr><td>Afgeronde hoeken</td><td><input type="number" id="vorm_hoekstraal" min="0" step="1" value="${vorm.hoekstraal}"> straal</td></tr>` : ''}
        </table>
        <div class="vorm-knoppen">
          <button class="rounded-button" id="vorm_ok">OK</button>
          <button class="rounded-button" id="vorm_annuleer">Annuleren</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const el = (id: string) => overlay.querySelector('#' + id) as HTMLInputElement | null;
    const lees = (): [Vorm, number] => {
        const v: Vorm = { ...origineel };
        const num = (id: string, std: number, min: number) => { const e = el(id); const n = e ? parseFloat(e.value) : NaN; return isFinite(n) && n >= min ? n : std; };
        v.breedte = num('vorm_breedte', origineel.breedte, 1);
        if (!isLijn) v.hoogte = num('vorm_hoogte', origineel.hoogte, 1);
        v.lijndikte = num('vorm_lijndikte', origineel.lijndikte, 0.1);
        v.kleur = el('vorm_kleur')?.value ?? origineel.kleur;
        v.stijl = (el('vorm_stijl')?.value as LijnStijl) ?? origineel.stijl;
        if (isLijn) {
            v.pijlBegin = !!el('vorm_pijlbegin')?.checked;
            v.pijlEind = !!el('vorm_pijleind')?.checked;
        } else {
            v.vulling = el('vorm_vult')?.checked ? (el('vorm_vulling')?.value ?? '#dddddd') : null;
        }
        if (vorm.soort === 'rechthoek') v.hoekstraal = num('vorm_hoekstraal', origineel.hoekstraal, 0);
        const rot = num('vorm_rotatie', origRotatie, -100000);
        return [v, rot];
    };

    const bijwerken = () => { const [v, r] = lees(); voorbeeld(v, r); };
    overlay.querySelectorAll('input, select').forEach(e => { e.addEventListener('input', bijwerken); e.addEventListener('change', bijwerken); });
    // Kiezen van een vulkleur vinkt "gevuld" automatisch aan
    el('vorm_vulling')?.addEventListener('input', () => { const c = el('vorm_vult'); if (c) c.checked = true; bijwerken(); });

    const sluit = (ok: boolean) => {
        const [v, r] = lees();
        document.removeEventListener('keydown', toetsen, true);
        overlay.remove();
        if (ok) { bewaarStijl(v); klaar(true, v, r); }
        else klaar(false, origineel, origRotatie);
    };
    const toetsen = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); sluit(false); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); sluit(true); }
        else e.stopPropagation(); // niet laten doorgaan naar de pijltjestoetsen van het situatieschema
    };
    document.addEventListener('keydown', toetsen, true);
    (el('vorm_ok') as any).onclick = () => sluit(true);
    (el('vorm_annuleer') as any).onclick = () => sluit(false);
    (el('vorm_breedte') as HTMLInputElement)?.focus();
}
