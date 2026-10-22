import { Electro_Item } from "./Electro_Item";
import { htmlspecialchars } from "../general";
import { SVGelement } from "../SVGelement";
import { SVGSymbols } from "../SVGSymbols";

/**
 * Detector: rook-, gas-, warmte-, vlam- of straaldetector, of een manuele melder.
 */
export class Detector extends Electro_Item {

    static readonly TYPES: { [naam: string]: string } = {
        "Gasdetector": "gasdetector",
        "Manuele detector": "manuele_detector",
        "Rookdetector": "rookdetector",
        "Straaldetector": "straaldetector",
        "Vlamdetector": "vlamdetector",
        "Warmtedetector": "warmtedetector"
    };

    resetProps() {
        this.clearProps();
        this.props.type = "Detector";
        this.props.detectortype = "Rookdetector";
        this.props.aantal = "1";
        this.props.adres = "";
    }

    overrideKeys() {
        if ( (this.props.detectortype == null) || !(this.props.detectortype in Detector.TYPES) ) this.props.detectortype = "Rookdetector";
        if (this.props.aantal == null) this.props.aantal = "1";
        if (this.props.adres == null) this.props.adres = "";
    }

    toHTML(mode: string) {
        this.overrideKeys();
        let output = this.toHTMLHeader(mode);

        const aantallen: Array<string> = [];
        for (let i=1; i<=50; i++) aantallen.push(String(i));

        output += "&nbsp;" + this.nrToHtml()
               +  "Type: " + this.selectPropToHTML('detectortype', Object.keys(Detector.TYPES))
               +  ", Aantal: " + this.selectPropToHTML('aantal', aantallen)
               +  ", Adres/tekst: " + this.stringPropToHTML('adres',5);

        return(output);
    }

    toSVG(sitplan = false) {
        this.overrideKeys();
        let mySVG:SVGelement = new SVGelement();

        const symbool = Detector.TYPES[this.props.detectortype];
        SVGSymbols.addSymbol(symbool);

        const metAantal = (!sitplan) && (Number(this.props.aantal) > 1);
        const shifty = (metAantal ? 12 : 0) + (symbool == "straaldetector" ? 10 : 0);

        mySVG.xleft = 1;
        mySVG.xright = 54;
        mySVG.yup = 25 + shifty;
        mySVG.ydown = 25 + (symbool == "straaldetector" ? 10 : 0);

        const y = 25 + shifty;
        if (metAantal) {
            mySVG.data += `<text x="36" y="${y-20}" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10">x${htmlspecialchars(this.props.aantal)}</text>`;
        }
        mySVG.data += (sitplan ? "" : `<line x1="1" y1="${y}" x2="21" y2="${y}" stroke="black" />`)
                   +  `<use xlink:href="#${symbool}" x="21" y="${y}" />`;

        mySVG.data += (sitplan ? "" : this.addAddressToSVG(mySVG, y+30+(symbool == "straaldetector" ? 10 : 0), 15));

        return(mySVG);
    }
}
