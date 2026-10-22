import { Electro_Item } from "./Electro_Item";
import { SVGelement } from "../SVGelement";
import { SVGSymbols } from "../SVGSymbols";

/**
 * Modulaire schakelaar (teleruptor, relais, dimmer, tijdschakelaar of minuterie) als apart symbool.
 *
 * Kind 1 is de aangestuurde verbruiker (bijvoorbeeld een lichtpunt) en wordt rechts van de module getekend.
 * Kind 2 is de bediening (bijvoorbeeld een drukknop) en wordt onder de module getekend, verbonden met een stippellijn.
 */
export class Modulaire_schakelaar extends Electro_Item {

    static readonly TYPES = ["teleruptor", "relais", "dimmer", "tijdschakelaar", "minuterie"];

    resetProps() {
        this.clearProps();
        this.props.type = "Modulaire schakelaar";
        this.props.module_type = "teleruptor";
        this.props.adres = "";
    }

    overrideKeys() {
        if (!Modulaire_schakelaar.TYPES.includes(this.props.module_type)) this.props.module_type = "teleruptor";
        if (this.props.adres == null) this.props.adres = "";
    }

    getMaxNumChilds(): number {
        let parent = this.getParent();
        if ( (parent != null) && (parent.getType() == "Meerdere verbruikers") ) return 0;
        return 2;
    }

    toHTML(mode: string) {
        this.overrideKeys();
        let output = this.toHTMLHeader(mode);

        output += "&nbsp;" + this.nrToHtml()
               +  "Type: " + this.selectPropToHTML('module_type', Modulaire_schakelaar.TYPES)
               +  ", Adres/tekst: " + this.stringPropToHTML('adres',5);

        return(output);
    }

    private kinderen(): Electro_Item[] {
        const out: Electro_Item[] = [];
        for (let i = 0; i<this.sourcelist.length; i++) {
            const item = this.sourcelist.data[i] as Electro_Item;
            if (this.sourcelist.active[i] && (item.parent == this.id) && !item.isAttribuut() && (item.getType() != "Container")) out.push(item);
        }
        return out;
    }

    toSVG(sitplan = false) {
        this.overrideKeys();
        SVGSymbols.addSymbol(this.props.module_type);

        // De module zelf: 20 pixels leiding + symbool van 40 breed
        let mySVG:SVGelement = new SVGelement();
        mySVG.xleft = 1;
        mySVG.xright = 60;
        mySVG.yup = 25;
        mySVG.ydown = 25;
        mySVG.data = (sitplan ? "" : '<line x1="1" y1="25" x2="21" y2="25" stroke="black" />')
                   + `<use xlink:href="#${this.props.module_type}" x="21" y="25" />`;

        if (sitplan) return mySVG;

        const kinderen = this.kinderen();

        // Kind 1: de aangestuurde verbruiker, rechts van de module
        if (kinderen.length >= 1) {
            const k1 = this.sourcelist.toSVG(kinderen[0].id, "horizontal", 0, true);
            const yup = Math.max(mySVG.yup, k1.yup);
            const shiftModule = yup - mySVG.yup;
            const shiftKind = yup - k1.yup;
            mySVG.data = `<svg x="0" y="${shiftModule}">${mySVG.data}</svg>`
                       + `<svg x="61" y="${shiftKind}">${k1.data}</svg>`;
            mySVG.ydown = Math.max(mySVG.ydown, k1.ydown);
            mySVG.yup = yup;
            mySVG.xright = 61 + k1.xleft + k1.xright - 1;
        }

        // Kind 2: de bediening, onder de module met een stippellijn
        if (kinderen.length >= 2) {
            const k2 = this.sourcelist.toSVG(kinderen[1].id, "horizontal", 0, true);
            const ytop = mySVG.yup + 13;            // onderkant van het module-symbool
            const ylijn = mySVG.yup + 13 + 12 + k2.yup;  // hoogte van de leiding naar de bediening
            mySVG.data += `<line x1="41" y1="${ytop}" x2="41" y2="${ylijn}" stroke="black" stroke-dasharray="3,2" />`
                       +  `<svg x="${41-k2.xleft}" y="${ylijn-k2.yup}">${k2.data}</svg>`;
            mySVG.ydown = Math.max(mySVG.ydown, (ylijn - mySVG.yup) + k2.ydown);
            mySVG.xright = Math.max(mySVG.xright, 41 - k2.xleft + k2.xleft + k2.xright);
        }

        mySVG.data += this.addAddressToSVG(mySVG, mySVG.yup + mySVG.ydown + 10, 15, 0);

        return(mySVG);
    }
}
