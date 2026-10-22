import { Electro_Item } from "./Electro_Item";
import { htmlspecialchars, svgTextWidth, trimString } from "../general";
import { SVGelement } from "../SVGelement";

/**
 * Omschakelaar (changeover switch).
 *
 * Wordt in een kring getekend met twee ingangen links:
 *  - onderaan de voeding vanuit de kring (komende van het bord)
 *  - bovenaan een tweede bron (de rest van de kring erboven, bvb. een generator of back-up)
 * De uitgang zit rechts; de kinderen van de omschakelaar worden daar verticaal aangesloten,
 * zoals bij een omvormer.
 */
export class Omschakelaar extends Electro_Item {

    convertLegacyKeys(mykeys: Array<[string,string,any]>) {
        this.props.type             = this.getLegacyKey(mykeys,0);
        this.props.nr               = this.getLegacyKey(mykeys,10);
        this.props.adres            = this.getLegacyKey(mykeys,15);
    }

    resetProps() {
        this.clearProps();
        this.props.type = "Omschakelaar";
        this.props.adres = "";
        this.props.details = "Omschakelaar";
    }

    allowedChilds() : Array<string> { // returns an array with the type-names of allowed childs
        return ["", "Aansluiting", "Domotica", "Domotica module (verticaal)", "Domotica gestuurde verbruiker", "Leiding", "Meerdere verbruikers", "Splitsing", "---", "Batterij", "Bel", "Boiler", "Contactdoos", "Detector", "Diepvriezer", "Droogkast", "Drukknop", "Elektriciteitsmeter", "Elektrische oven", "EV lader", "Ketel", "Koelkast", "Kookfornuis", "Lichtcircuit", "Lichtpunt", "Media", "Microgolfoven", "Modulaire schakelaar", "Motor", "Omschakelaar", "Omvormer", "Overspanningsbeveiliging", "Schakelaars", "Stoomoven", "Transformator", "USB lader", "Vaatwasmachine", "Ventilator", "Verlenging", "Verwarmingstoestel", "Verbruiker", "Vrije tekst", "Warmtepomp/airco", "Wasmachine", "Zekering/differentieel", "Zonnepaneel", "---", "Aansluitpunt", "Aftakdoos", "Zeldzame symbolen"];
    }

    getMaxNumChilds(): number {
        return 256;
    }

    overrideKeys() {
        if (this.props.details == null) this.props.details = (this.props.tekst != null ? this.props.tekst : "Omschakelaar");
        delete this.props.tekst;
        if (this.props.adres == null) this.props.adres = "";
    }

    toHTML(mode: string) {
        this.overrideKeys();
        let output = this.toHTMLHeader(mode);

        output += "&nbsp;" + this.nrToHtml();
        output += "Tekst onder object: " + this.stringPropToHTML('details',12) + ", ";
        output += "Adres: " + this.stringPropToHTML('adres',5);

        return(output);
    }

    /** Tekent het schakelsymbool in een kader dat links begint op x0 en verticaal gecentreerd is rond yc. */
    private switchSymbol(x0: number, yc: number): string {
        const cUp   = { x: x0 + 13, y: yc - 5 };   // contact tweede bron
        const cDown = { x: x0 + 13, y: yc + 5 };   // contact voeding uit de kring
        const pivot = { x: x0 + 37, y: yc };       // gemeenschappelijk contact = uitgang
        let s = '';
        s += `<line x1="${x0}" y1="${cUp.y}" x2="${cUp.x}" y2="${cUp.y}" stroke="black" />`;
        s += `<line x1="${x0}" y1="${cDown.y}" x2="${cDown.x}" y2="${cDown.y}" stroke="black" />`;
        s += `<line x1="${pivot.x}" y1="${pivot.y}" x2="${x0 + 50}" y2="${pivot.y}" stroke="black" />`;
        s += `<line x1="${pivot.x}" y1="${pivot.y}" x2="${cDown.x + 3}" y2="${cDown.y - 1}" stroke="black" stroke-width="1.5" />`;
        for (const p of [cUp, cDown, pivot]) s += `<circle cx="${p.x}" cy="${p.y}" r="2" fill="black" />`;
        return s;
    }

    toSVG(sitplan = false) {
        let mySVG:SVGelement = new SVGelement();

        if (sitplan) {
            mySVG.yup = 25;
            mySVG.ydown = 25;
            mySVG.xleft = 1;
            mySVG.xright = 49;
            mySVG.data += `<rect x="1" y="5" width="48" height="40" stroke="black" stroke-width="2" fill="white" />`
                       +  this.switchSymbol(0, 25).replace(/<line x1="0"[^>]*\/>/g, '');
            return(mySVG);
        }

        /* else (not sitplan) */

        this.overrideKeys();
        const text = htmlspecialchars(this.props.details ?? "");

        // Eerst vragen we een tekening van alle kinderen
        mySVG = this.sourcelist.toSVG(this.id,"vertical");

        // Hoogte van het kader: minstens 50, anders zo hoog als de kinderen
        const heightunaltered = mySVG.yup + mySVG.ydown;
        const height = Math.max(heightunaltered, 50);
        const yc = height/2;

        // Kinderen rechts van het kader plaatsen
        mySVG.data = '<svg x="70" y="' + (height-heightunaltered)/2 + '">' + mySVG.data + '</svg>';

        mySVG.yup = yc;
        mySVG.ydown = yc;
        mySVG.firstChildydown = null;
        mySVG.lastChildyup = null;
        mySVG.xleft = 1;
        mySVG.xright += 70;

        // Ingangen links (vanaf de kringlijn)
        mySVG.data += `<line x1="1" x2="21" y1="${yc-5}" y2="${yc-5}" stroke="black" />`
                   +  `<line x1="1" x2="21" y1="${yc+5}" y2="${yc+5}" stroke="black" />`;

        // Kader (even hoog als de kinderen, minstens 40) en schakelsymbool
        const rectHeight = Math.max(40, height - 10);
        mySVG.data += `<rect x="21" y="${yc-rectHeight/2}" width="50" height="${rectHeight}" stroke="black" stroke-width="2" fill="white" />`;
        mySVG.data += this.switchSymbol(21, yc);

        // Adres en tekst onder het kader (zelfde regels als bij de andere objecten met tekst eronder)
        mySVG.ydown = yc;
        mySVG.data += this.addAdresEnDetailsToSVG(mySVG, 46, 0);

        return(mySVG);
    }

}
