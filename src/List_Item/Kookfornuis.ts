import { Electro_Item } from "./Electro_Item";
import { SVGelement } from "../SVGelement";
import { SVGSymbols } from "../SVGSymbols";

export class Kookfornuis extends Electro_Item {

    convertLegacyKeys(mykeys: Array<[string,string,any]>) {
        this.props.type             = this.getLegacyKey(mykeys,0);
        this.props.nr               = this.getLegacyKey(mykeys,10);
        this.props.adres            = this.getLegacyKey(mykeys,15);
    }

    resetProps() {
        this.clearProps();
        this.props.type = "Kookfornuis";
        this.props.adres = "";
        this.props.aantal_fases_indien_meerfasig = "3";
        this.props.is_meerfasig = false;
        this.props.heeft_nul_indien_meerfasig = false;  
    } 

    toHTML(mode: string) {
        let output = this.toHTMLHeader(mode);

        output += "&nbsp;" + this.nrToHtml();
        if (this.props.is_meerfasig == null) this.props.is_meerfasig = false;
        if (this.props.aantal_fases_indien_meerfasig == null) this.props.aantal_fases_indien_meerfasig = "3";
        if (this.props.heeft_nul_indien_meerfasig == null) this.props.heeft_nul_indien_meerfasig = false;
        output += "Meerfasig: " + this.checkboxPropToHTML('is_meerfasig') + ", ";
        if (this.props.is_meerfasig) {
            output += "Aantal fasen: " + this.selectPropToHTML('aantal_fases_indien_meerfasig',["1","2","3"]) + ", "
                   +  "Met nul: " + this.checkboxPropToHTML('heeft_nul_indien_meerfasig') + ", ";
        }
        output += "Adres/tekst: " + this.stringPropToHTML('adres',5);

        return(output);
    }

    toSVG(sitplan = false) {
        let mySVG:SVGelement = new SVGelement();

        SVGSymbols.addSymbol('kookfornuis');

        mySVG.xleft = 1; // foresee at least some space for the conductor
        mySVG.xright = 59;
        mySVG.yup = 25;
        mySVG.ydown = 25;

        let shift = 0;
        if (this.props.is_meerfasig && !sitplan) {
            // Dwarsstreepjes op de leiding om het aantal fasen aan te duiden
            shift = 20;
            const n = Math.max(1, Math.min(3, Number(this.props.aantal_fases_indien_meerfasig) || 3));
            const start = 21 - (n-1)*3;
            for (let i=0; i<n; i++) {
                const x = start + i*6;
                mySVG.data += `<line x1="${x-3}" y1="33" x2="${x+3}" y2="17" stroke="black" />`;
            }
            if (this.props.heeft_nul_indien_meerfasig) {
                const x = start + n*6 + 4;
                mySVG.data += `<line x1="${x-3}" y1="33" x2="${x+3}" y2="17" stroke="black" />`
                           +  `<circle cx="${x-3}" cy="33" r="2" fill="black" stroke="black" />`;
                shift += 6;
            }
        }
        mySVG.data += (sitplan? "" : `<line x1="1" y1="25" x2="${21+shift}" y2="25" stroke="black"></line>`)
                   + `<use xlink:href="#kookfornuis" x="${21+shift}" y="25"></use>`;
        mySVG.xright += shift;
        
        mySVG.data += (sitplan? "" : this.addAddressToSVG(mySVG,60,15));

        return(mySVG);
    }

}