import { Electro_Item } from "./Electro_Item";
import { htmlspecialchars } from "../general";
import { SVGelement } from "../SVGelement";
import { SVGSymbols } from "../SVGSymbols";

export class Domotica_gestuurde_verbruiker extends Electro_Item {

    convertLegacyKeys(mykeys: Array<[string,string,any]>) {
        this.props.type                   = this.getLegacyKey(mykeys,0);
        this.props.type_externe_sturing   = this.getLegacyKey(mykeys,5);
        this.props.nr                     = this.getLegacyKey(mykeys,10);
        this.props.adres                  = this.getLegacyKey(mykeys,15);
        this.props.is_draadloos           = this.getLegacyKey(mykeys,19);
        this.props.heeft_lokale_drukknop  = this.getLegacyKey(mykeys,20);
        this.props.is_geprogrammeerd      = this.getLegacyKey(mykeys,21);
        this.props.heeft_detectie         = this.getLegacyKey(mykeys,25);
        this.props.heeft_externe_sturing  = this.getLegacyKey(mykeys,26);
    }

    resetProps() {
        this.clearProps();
        this.props.type = "Domotica gestuurde verbruiker";
        this.props.type_externe_sturing = "drukknop";
        this.props.adres = "";
        this.props.is_draadloos = true;
        this.props.heeft_lokale_drukknop = true;
        this.props.is_geprogrammeerd = true;
        this.props.heeft_detectie = false;
        this.props.heeft_externe_sturing = false;
    }

    allowedChilds() : Array<string> { // returns an array with the type-names of allowed childs
        return ["", "Batterij", "Bel", "Boiler", "Contactdoos", "Detector", "Diepvriezer", "Droogkast", "Drukknop", "Elektrische oven", "EV lader", "Ketel", "Koelkast", "Kookfornuis", "Lichtcircuit", "Lichtpunt", "Media", "Microgolfoven", "Modulaire schakelaar", "Motor", "Omvormer", "Overspanningsbeveiliging", "Schakelaars", "Stoomoven", "Transformator", "USB lader", "Vaatwasmachine", "Ventilator", "Verlenging", "Verwarmingstoestel", "Verbruiker", "Vrije tekst", "Warmtepomp/airco", "Wasmachine", "Zonnepaneel", "---", "Aansluitpunt", "Aftakdoos", "Zeldzame symbolen"];
    }

    getMaxNumChilds(): number {
        return 2; // Kind 1 staat in het kader, kind 2 wordt rechts van het kader getekend
    }

    toHTML(mode: string) {
        let output = this.toHTMLHeader(mode);

        output += "&nbsp;" + this.nrToHtml()
               +    "Draadloos: " + this.checkboxPropToHTML('is_draadloos')
               +  ", Lokale Drukknop: " + this.checkboxPropToHTML('heeft_lokale_drukknop')
               +  ", Geprogrammeerd: " + this.checkboxPropToHTML('is_geprogrammeerd')
               +  ", Detectie: " + this.checkboxPropToHTML('heeft_detectie')
               +  ", Externe sturing: " + this.checkboxPropToHTML('heeft_externe_sturing');    

        if (this.props.heeft_externe_sturing) output += ", Externe sturing: " + this.selectPropToHTML('type_externe_sturing',["drukknop","schakelaar"]);

        output += ", Adres/tekst: " + this.stringPropToHTML('adres',5); 

        return(output);
    }

    toSVG(sitplan = false) {
        let mySVG:SVGelement = new SVGelement();

        SVGSymbols.addSymbol('draadloos_klein');
        SVGSymbols.addSymbol('drukknop_klein');
        SVGSymbols.addSymbol('tijdschakelaar_klein');
        SVGSymbols.addSymbol('detectie_klein');
        SVGSymbols.addSymbol('schakelaar_klein');

        // Eerst de tekening van de aangestuurde verbruiker maken

        let childcounter = 0; // Kind 1 is het element dat effectief gestuurd wordt en staat in het kader.
                              // Kind 2 (optioneel) wordt rechts van het kader getekend.
        let tweedeKindId: number | null = null;

        for (let i = 0; i<this.sourcelist.length; i++) {
            if ( this.isActief() && (this.sourcelist.data[i].parent == this.id ) 
                && !((this.sourcelist.data[i] as Electro_Item).isAttribuut() ) ) {
                childcounter++; // We hebben een kind gevonden
                switch (childcounter) {
                    case 1: // Het Kind is het eerste element, i.e. de aangestuurde verbruiker. We tekenen dit kind.
                        mySVG = this.sourcelist.toSVG(this.sourcelist.data[i].id,"horizontal",35,true);
                        break;      
                    case 2:
                        tweedeKindId = this.sourcelist.data[i].id;
                        break;
                }
            }
        }

        // We maken het aangestuurde element altijd minstens 50 x 56 pixels groot

        if (mySVG.yup + mySVG.ydown < 50) { mySVG.yup = 25; mySVG.ydown = 25; }
        if (mySVG.xleft + mySVG.xright < 56) { mySVG.xleft = 1; mySVG.xright = 55; }

        // We plaatsen het aangestuurde element in een kader

        mySVG.data = '<svg x="' + (21+5) + '" y="25">' + mySVG.data + '</svg>';

        mySVG.data +=   '<rect x="' + (21) + '" y="' + (5) +
                        '" width="' + (mySVG.xleft + mySVG.xright+12) +
                        '" height="' + (mySVG.yup + mySVG.ydown + 20) + '" stroke="black" fill="none" />';

        mySVG.data +=   '<line x1="' + (21) + '" x2="' + (21 + mySVG.xleft + mySVG.xright+12) + '" y1="' + (25) + '" y2="' + (25) + '" stroke="black" />';                              
        
        mySVG.xright += (21 + 12); //We shifted the element by 21 and then added a margin of 5 left and 7 right
        mySVG.yup += 25; 
        mySVG.ydown += 5; 

        // We plaatsen de leiding links

        mySVG.data +=   '<line x1="'+ mySVG.xleft + '" x2="' + (mySVG.xleft+20) +
                        '" y1="' + (mySVG.yup) + '" y2="' + (mySVG.yup) + '" stroke="black" />';

        // We plaatsen de symbolen bovenaan

        if (this.props.is_draadloos) mySVG.data += '<use xlink:href="#draadloos_klein" x="22" y="15"></use>';
        if (this.props.heeft_lokale_drukknop) mySVG.data += '<use xlink:href="#drukknop_klein" x="38" y="15"></use>';
        if (this.props.is_geprogrammeerd) mySVG.data += '<use xlink:href="#tijdschakelaar_klein" x="54" y="15"></use>';
        if (this.props.heeft_detectie) mySVG.data += '<use xlink:href="#detectie_klein" x="70" y="15"></use>';

        if (this.props.heeft_externe_sturing) {
            switch(this.props.type_externe_sturing) {
                case "schakelaar":
                    mySVG.data = '<svg x="' + (0) + '" y="20">' + mySVG.data + '</svg>'
                               + '<use xlink:href="#schakelaar_klein" x="78" y="18"></use>'
                               + '<line x1="78" y1="21" x2="78" y2="25" stroke="black" />';
                    mySVG.yup += 20;
                    break; 
                case "drukknop":
                default:  
                    mySVG.data = '<svg x="' + (0) + '" y="20">' + mySVG.data + '</svg>'
                               + '<use xlink:href="#drukknop_klein" x="70" y="14"></use>'
                               + '<line x1="78" y1="21" x2="78" y2="25" stroke="black" />';
                    mySVG.yup += 20;
            }
        }

        // Tweede kind rechts van het kader tekenen
        if ( (tweedeKindId !== null) && (sitplan == false) ) {
            const k2 = this.sourcelist.toSVG(tweedeKindId, "horizontal", 0, true);
            const xstart = mySVG.xleft + mySVG.xright;
            const yup = Math.max(mySVG.yup, k2.yup);
            const dy = yup - mySVG.yup;
            mySVG.data = `<svg x="0" y="${dy}">${mySVG.data}</svg>`
                       + `<svg x="${xstart - k2.xleft + 1}" y="${yup - k2.yup}">${k2.data}</svg>`;
            mySVG.ydown = Math.max(mySVG.ydown + 0, k2.ydown) ;
            mySVG.yup = yup;
            mySVG.xright = mySVG.xright + k2.xleft + k2.xright;
        }

        //Place text below if there is any

        if (sitplan == false) {
            if (!(/^\s*$/.test(this.props.adres))) { //check if adres contains only white space
                mySVG.data += '<text x="' + ((mySVG.xright-20)/2 + 21 + 0) + '" y="' + (mySVG.ydown + mySVG.yup + 10) 
                        +  '" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-style="italic">' 
                        + htmlspecialchars(this.props.adres) + '</text>';
                        
                mySVG.ydown += 15;
            }  
        }

        return(mySVG);
    }

}