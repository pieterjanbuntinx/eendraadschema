import { Splitsing } from "./Splitsing";
import { SVGelement } from "../SVGelement";
import { htmlspecialchars } from "../general";

/**
 * Klemmenstrook: een vertakking (zoals een splitsing) waarbij de kringen op een klemmenstrook worden aangesloten.
 * De klemmenstrook wordt als een strook met klemmen op de horizontale verdeellijn getekend.
 */
export class Klemmenstrook extends Splitsing {

    resetProps() {
        this.clearProps();
        this.props.type = "Klemmenstrook";
        this.props.adres = "";
    }

    toHTML(mode: string) {
        if (this.props.adres == null) this.props.adres = "";
        let output = this.toHTMLHeader(mode);
        output += "&nbsp;Adres/tekst: " + this.stringPropToHTML('adres',5);
        return(output);
    }

    toSVG() {
        let mySVG: SVGelement = super.toSVG();

        // Strook met klemmen over de verdeellijn tekenen
        const x1 = mySVG.xleft - 6;
        const breedte = Math.max(mySVG.xrightmin + 12, 24);
        const y = mySVG.yup;
        let strook = `<rect x="${x1}" y="${y-5}" width="${breedte}" height="10" fill="white" stroke="black" />`;
        for (let x = x1 + 8; x < x1 + breedte - 2; x += 8) {
            strook += `<line x1="${x}" y1="${y-5}" x2="${x}" y2="${y+5}" stroke="black" />`;
        }
        mySVG.data += strook;

        if ( (this.props.adres != null) && !(/^\s*$/.test(this.props.adres)) ) {
            mySVG.data += `<text x="${x1 + breedte + 4}" y="${y+4}" style="text-anchor:start" font-family="Arial, Helvetica, sans-serif" font-size="10" font-style="italic">${htmlspecialchars(this.props.adres)}</text>`;
        }

        mySVG.ydown = Math.max(mySVG.ydown, 8);
        return(mySVG);
    }
}
