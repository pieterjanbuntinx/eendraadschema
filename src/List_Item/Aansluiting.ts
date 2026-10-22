import { Electro_Item } from "./Electro_Item";
import { htmlspecialchars, svgTextWidth, trimString, parseLocaleFloat } from "../general";
import { SVGelement } from "../SVGelement";
import { SVGSymbols } from "../SVGSymbols";

export class Aansluiting extends Electro_Item {
    
    convertLegacyKeys(mykeys: Array<[string,string,any]>) {
        this.props.type                                 = this.getLegacyKey(mykeys,0);
        this.props.aantal_polen                         = this.getLegacyKey(mykeys,4);
        this.props.bescherming                          = this.getLegacyKey(mykeys,7);
        this.props.amperage                             = this.getLegacyKey(mykeys,8);
        this.props.type_kabel_na_teller                 = this.getLegacyKey(mykeys,9);
        this.props.nr                                   = this.getLegacyKey(mykeys,10);        
        this.props.differentieel_delta_amperage         = this.getLegacyKey(mykeys,11);
        this.props.adres                                = this.getLegacyKey(mykeys,15);
        this.props.differentieel_is_selectief           = this.getLegacyKey(mykeys,20);
        this.props.kortsluitvermogen                    = this.getLegacyKey(mykeys,22);
        this.props.naam                                 = this.getLegacyKey(mykeys,23);
        this.props.type_kabel_voor_teller               = this.getLegacyKey(mykeys,24);
        this.props.huishoudelijk                        = true;
        this.props.fase                                 = '';
        switch (this.props.bescherming) {
            case "differentieel":
                this.props.type_differentieel = this.getLegacyKey(mykeys,17);
                break;
            case "automatisch":
                this.props.curve_automaat = this.getLegacyKey(mykeys,17);               
                break;
            case "differentieelautomaat":
                this.props.type_differentieel = this.getLegacyKey(mykeys,17);
                this.props.curve_automaat = this.getLegacyKey(mykeys,18);
                break;
        }
    } 

    resetProps() {
        this.clearProps();
        this.props.type = "Aansluiting";
        this.props.aantal_polen = "2";
        this.props.bescherming = "differentieel";
        this.props.amperage = "40";
        this.props.type_kabel_na_teller = "2x16";
        this.props.differentieel_delta_amperage = "300";
        this.props.adres = "";
        this.props.type_differentieel = "A";
        this.props.curve_automaat = "C";
        this.props.differentieel_is_selectief = false;
        this.props.kortsluitvermogen = "3";
        this.props.naam = "";
        this.props.type_kabel_voor_teller = "";
        this.props.huishoudelijk = true;
        this.props.fase = '';
        this.props.normaalGesloten = false;
        this.props.newPage = false;
        this.props.met_teller = true;
        this.props.kabel_locatie = "N/A";
        this.props.kabel_is_in_buis = false;
        this.props.details = "";
    }

    allowedChilds() : Array<string> { // returns an array with the type-names of allowed childs
        return ["", "Bord", "Kring", "Splitsing"];
    }

    getMaxNumChilds(): number {
        return 256;
        // Dit kan vreemd lijken omdat in principe een aansluiting maar 1 kind heeft.
        // Echter, in het verleden was 256 wel toegelaten en het is niet uit te sluiten dat gebruikers meerdere kringen onder een aansluiting gehangen hebben
        // om deze kringen verticaal te kunnen stapelen. Om het programma backward compatibel te houden behouden we dus 256 tot grandfathering code kan worden ontwikkeld.
        // Ook laat dit toe om tijdelijk een elementje onder aansluiting te hangen alvorens het met move elders onder te brengen
    }

    overrideKeys() {
        if (this.props.curve_automaat === "E") this.props.curve_automaat = "U"; // used to be called "E" in older saves

        if (this.props.normaalGesloten == null) this.props.normaalGesloten = false;
        if (this.props.newPage == null) this.props.newPage = false;

        if (this.props.bescherming == "schakelaar") this.props.bescherming = "contact"; // used to be called "schakelaar" in older saves

        if ( (this.props.aantal_polen !== '') &&
             ( ( (this.props.aantal_polen as number) < 1 ) || 
               ( (this.props.aantal_polen as number) > 4 ) ) ) this.props.aantal_polen = "2"; //Test dat aantal polen bestaat

        if ( (this.props.normaalGesloten === true) && (!["contact","zekeringscheider"].includes(this.props.bescherming)) ) {
            this.props.normaalGesloten = false; // Indien normaal gesloten, dan moet de bescherming een contact of zekeringscheider zijn
        }

        // nooit een newPage als dit geen kind van root is of het eerste kind van root
        if (this.getParent() !== null) {
            this.props.newPage = false;
        } else {
            let firstChildId = this.sourcelist.getFirstChildId(0);
            if (firstChildId !== null && this.id === firstChildId) this.props.newPage = false;
        }

        if (typeof(this.props.huishoudelijk) == 'undefined') this.props.huishoudelijk = true;
        if (typeof(this.props.met_teller) == 'undefined') this.props.met_teller = true;
        if (this.props.kabel_locatie == null) this.props.kabel_locatie = "N/A";
        if (this.props.kabel_is_in_buis == null) this.props.kabel_is_in_buis = false;
        if (this.props.kabel_locatie == "Luchtleiding") this.props.kabel_is_in_buis = false;
        if (this.props.details == null) this.props.details = "";
        if (!["automatisch", "differentieel", "differentieelautomaat", "smelt"].includes(this.props.bescherming)) this.props.fase = '';
        if (!["automatisch", "differentieel", "differentieelautomaat"].includes(this.props.bescherming)) this.props.kortsluitvermogen = '';
    }

    toHTML(mode: string) {
        this.overrideKeys();
        let output = this.toHTMLHeader(mode);

        output += "&nbsp;Naam: " + this.stringPropToHTML('naam',5) + "<br>";

        if (this.getParent() != null) {
            const nrHtml = this.nrToHtml();
            output += (typeof nrHtml === "string" ? nrHtml.substring(2) : nrHtml);
        }
        
        output += "Met teller: " + this.checkboxPropToHTML('met_teller')
               +  ", Kabeltype na teller: " + this.stringPropToHTML('type_kabel_na_teller',10)
               +  ", Plaatsing: " + this.selectPropToHTML('kabel_locatie',["N/A","Ondergronds","Luchtleiding","In wand","Op wand"]);
        if (this.props.kabel_locatie != "Luchtleiding") output += ", In buis: " + this.checkboxPropToHTML('kabel_is_in_buis');
        if (this.props.met_teller) output += ", Kabeltype v&oacute;&oacute;r teller: " + this.stringPropToHTML('type_kabel_voor_teller',10);
        output += ", Bescherming: " + this.selectPropToHTML('bescherming',["automatisch","differentieel","differentieelautomaat","smelt","geen","---","contact","zekeringscheider","draaischakelaar","schemer"]) 

        if (this.props.bescherming != "geen") output += this.selectPropToHTML('aantal_polen',["2","3","4","-","1",""]) + this.stringPropToHTML('amperage',2) + "A";

        switch (this.props.bescherming) {

            case "differentieel":
                output += ", \u0394 " + this.stringPropToHTML('differentieel_delta_amperage',3) + "mA"
                        +  ", Type:" + this.selectPropToHTML('type_differentieel',["","A","B","F"])
                        +  ", Kortsluitstroom: " + this.stringPropToHTML('kortsluitvermogen',3) + "kA"
                        +  ", Selectief: " + this.checkboxPropToHTML('differentieel_is_selectief')
                        +  ", Fase: " + this.fasePropToHTML();
                break;

            case "automatisch":
                output += ", Curve:" + this.selectPropToHTML('curve_automaat',["","B","C","D","U"])
                        +  ", Kortsluitstroom: " + this.stringPropToHTML('kortsluitvermogen',3) + "kA"
                        +  ", Fase: " + this.fasePropToHTML();
                break;

            case "differentieelautomaat":
                output += ", \u0394 " + this.stringPropToHTML('differentieel_delta_amperage',3) + "mA"
                        +  ", Curve:" + this.selectPropToHTML('curve_automaat',["","B","C","D","U"])
                        +  ", Type:" + this.selectPropToHTML('type_differentieel',["","A","B","F"])
                        +  ", Kortsluitstroom: " + this.stringPropToHTML('kortsluitvermogen',3) + "kA"
                        +  ", Selectief: " + this.checkboxPropToHTML('differentieel_is_selectief')
                        +  ", Fase: " + this.fasePropToHTML();
                break;

            case "smelt":
                output += ", Fase: " + this.fasePropToHTML();
                break;

            case "contact":
            case "zekeringscheider":
                output += ", Normaal Gesloten: " + this.checkboxPropToHTML('normaalGesloten');
                break;

        }


        if ((this.props.kortsluitvermogen != '') && (['differentieel','automatisch','differentieelautomaat'].includes(this.props.bescherming))) {
            output += ", Huishoudelijke installatie: " + this.checkboxPropToHTML('huishoudelijk');
        }

        // Only show newPage checkbox if not the first child of root node
        // nooit een newPage als dit geen kind van root is of het eerste kind van root
        if (this.getParent() == null) { 
            let firstChildId = this.sourcelist.getFirstChildId(0);
            if (firstChildId !== null && this.id !== firstChildId) {
                output += ", Start op nieuwe pagina: " + this.checkboxPropToHTML('newPage');
            }
        }

        if (this.props.met_teller) output += ', Tekst onder object (nieuwe lijn = "|"): ' + this.stringPropToHTML('details',20);
        output += ", Adres/tekst: " + this.stringPropToHTML('adres',5);

        return(output);
    }

    // -- Kleine symbolen op de horizontale leiding na de teller (in buis, luchtleiding, ondergronds, in/op wand) --

    kabelLocatieHorizontaalSVG(x: number, y: number): string {
        let s = "";
        if (this.props.kabel_locatie == "Luchtleiding") {
            s += `<circle cx="${x}" cy="${y}" r="4" style="stroke:black;fill:none" />`;
        } else if (this.props.kabel_is_in_buis) {
            s += `<circle cx="${x}" cy="${y-10}" r="4" style="stroke:black;fill:none" />`;
        }
        const x2 = x + 14;
        switch (this.props.kabel_locatie) {
            case "Ondergronds":
                s += `<line x1="${x2}" x2="${x2+20}" y1="${y-13}" y2="${y-13}" stroke="black" />`
                  +  `<line x1="${x2+2}" x2="${x2+18}" y1="${y-10}" y2="${y-10}" stroke="black" />`
                  +  `<line x1="${x2+4}" x2="${x2+16}" y1="${y-7}" y2="${y-7}" stroke="black" />`;
                break;
            case "In wand":
                s += `<line x1="${x2}" x2="${x2+20}" y1="${y-15}" y2="${y-15}" stroke="black" />`;
                for (const dx of [0,10,20]) s += `<line x1="${x2+dx}" x2="${x2+dx}" y1="${y-15}" y2="${y-5}" stroke="black" />`;
                break;
            case "Op wand":
                s += `<line x1="${x2}" x2="${x2+20}" y1="${y-5}" y2="${y-5}" stroke="black" />`;
                for (const dx of [0,10,20]) s += `<line x1="${x2+dx}" x2="${x2+dx}" y1="${y-15}" y2="${y-5}" stroke="black" />`;
                break;
        }
        return s;
    }

    toSVG(sitplan = false): SVGelement {

        let addFase = (startNumlines:number, mySVG:SVGelement): number => {
            let numlines = startNumlines;
            if (trimString(this.props.fase ?? '') !== '') {
                numlines = numlines + ((this.props.huishoudelijk && this.props.kortsluitvermogen != '') ? 1.3 : 1.0);
                mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                        +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                        +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                        +  htmlspecialchars(this.props.fase) + "</text>";
            }
            return numlines;
        }

        // Als we het situateplan tekenen, dan tekenen we enkel de elektriciteitsmeter

        if (sitplan) {
                    let mySVG:SVGelement = new SVGelement();

            SVGSymbols.addSymbol('elektriciteitsmeter');

            mySVG.xleft = 1; // foresee at least some space for the conductor
            mySVG.xright = 59;
            mySVG.yup = 25;
            mySVG.ydown = 25;

            mySVG.data = '<use xlink:href="#elektriciteitsmeter" x="21" y="25"></use>';
            
            return(mySVG);
        }

        // Zo-niet tekenen we de hele aansluiting met zekering, differentieel, of ander symbool onderaan

        let mySVG:SVGelement = new SVGelement();

        SVGSymbols.addSymbol('zekering_automatisch');
        SVGSymbols.addSymbol('zekering_empty');
        SVGSymbols.addSymbol('zekering_smelt');
        SVGSymbols.addSymbol('zekeringscheider');
        SVGSymbols.addSymbol('draaischakelaar_verticaal');
        SVGSymbols.addSymbol('arrow');
        SVGSymbols.addSymbol('elektriciteitsmeter');

        // Tekst voor aantal polen en amperage

        let aantalpolenstr = '';
        if (this.props.aantal_polen !== '') aantalpolenstr = `${htmlspecialchars(this.props.aantal_polen)}P`;

        let amperagestr = '';
        if (trimString(this.props.amperage) !== '') amperagestr = `${htmlspecialchars(this.props.amperage)}A`;

        let aantalpolenamperagestr = '';
        if (aantalpolenstr !== '' && amperagestr !== '') {
            aantalpolenamperagestr = `${aantalpolenstr} - ${amperagestr}`;
        } else if (aantalpolenstr !== '') {
            aantalpolenamperagestr = aantalpolenstr;
        } else if (amperagestr !== '') {
            aantalpolenamperagestr = amperagestr;
        }

        // Indien er een kabeltype vóór de teller is schuiven we alles op
        let extrashift = 0;
        const metTeller = (this.props.met_teller !== false);
        if (metTeller && this.props.type_kabel_voor_teller != "") extrashift += 50;

        // get image of the entire stack, make sure it is shifted to the right sufficiently so-that the counter can be added below
        mySVG = this.sourcelist.toSVG(this.id, "vertical", 150 + extrashift); //shift 150 to the right

        // Lijntje met hoogte 20 plaatsen net boven differentieel of automaat
        mySVG.data += '<line x1="' + mySVG.xleft + '" x2="' + mySVG.xleft + '" y1="' + mySVG.yup + '" y2="' + (mySVG.yup+20) + '" stroke="black" />';
        mySVG.yup += 20;

        // Zekering, differentieel, of ander symbool onderaan plaatsen

        let numlines = 1;   // Hier houden we het aantal lijnen tekst bij 

        switch (this.props.bescherming) {

            case "automatisch":

                numlines = (trimString(aantalpolenamperagestr) !== '' ? 1 : 0); // Hier houden we het aantal lijnen tekst bij
                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                // Basiscode voor het amperage        
                mySVG.data += '<use xlink:href="#zekering_automatisch" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                           +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                           +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                           +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                           +  aantalpolenamperagestr + "</text>";

                // Code om de curve toe te voegen
                if ( (this.props.curve_automaat=='B') || (this.props.curve_automaat=='C') || (this.props.curve_automaat=='D') || (this.props.curve_automaat=='U') ) {
                    ++numlines;
                    mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                               +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                               +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                               +  htmlspecialchars("Curve " + this.props.curve_automaat) + "</text>";
                }

                // Code om kortsluitvermogen toe te voegen
                if ( (this.props.kortsluitvermogen!='') ) {
                    if (this.props.huishoudelijk) {
                        numlines = numlines + 1.3;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)) + "</text>";
                        let rectsize = svgTextWidth(htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)))+6;
                        mySVG.data += '<rect x="' + (mySVG.xleft+15+11*(numlines-2)+1) + '" y="' + (mySVG.yup-10-(rectsize/2)) + '" width="' + (11*1.2) + '" height="' + rectsize + '" fill="none" stroke="black" />';
                    } else {
                        numlines = numlines + 1.0;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (this.props.kortsluitvermogen)) + "kA</text>";
                    }
                }

                // Code om fase toe te voegen
                numlines = addFase.bind(this)(numlines, mySVG);

                // Genoeg plaats voorzien aan de rechterkant en eindigen
                mySVG.xright = Math.max(mySVG.xright,20+11*(numlines-1));
                break;

            case "differentieel":

                // Code als differentieel selectief is
                if (this.props.differentieel_is_selectief) {
                    mySVG.data += '<line x1="' + mySVG.xleft + '" x2="' + mySVG.xleft + '" y1="' + mySVG.yup + '" y2="' + (mySVG.yup+30) + '" stroke="black" />'
                               +  '<rect x="' + (mySVG.xleft+7) + '" y="' + (mySVG.yup) + '" width="16" height="16" stroke="black" fill="white" />'
                               +  "<text x=\"" + (mySVG.xleft+19) + "\" y=\"" + (mySVG.yup+8) + "\"" + " transform=\"rotate(-90 " + (mySVG.xleft+19) + "," + (mySVG.yup+8) + ")" 
                               +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" + "S" + "</text>";
                    mySVG.yup += 23;
                }

                numlines = 1 + (trimString(aantalpolenamperagestr) !== '' ? 1 : 0); // Hier houden we het aantal lijnen tekst bij
                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                // Basiscode voor het amperage en de sluitstroom       
                mySVG.data += '<use xlink:href="#zekering_automatisch" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                           +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                           +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                           +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                           +  "\u0394" + htmlspecialchars(this.props.differentieel_delta_amperage + "mA") + "</text>"
                           +  "<text x=\"" + (mySVG.xleft+26) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                           +  " transform=\"rotate(-90 " + (mySVG.xleft+26) + "," + (mySVG.yup-10) + ")" 
                           +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                           +  aantalpolenamperagestr + "</text>";

                // Code om het type toe te voegen
                if ( ['A','B','F'].includes(this.props.type_differentieel) ) {
                    ++numlines;
                    mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                               + " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                               + "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                               + htmlspecialchars("Type " + this.props.type_differentieel) + "</text>";

                }

                // Code om kortsluitvermogen toe te voegen
                if ( (this.props.kortsluitvermogen!='') ) {
                    if (this.props.huishoudelijk) {
                        numlines = numlines + 1.3;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)) + "</text>";
                        let rectsize = svgTextWidth(htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)))+6;
                        mySVG.data += '<rect x="' + (mySVG.xleft+15+11*(numlines-2)+1) + '" y="' + (mySVG.yup-10-(rectsize/2)) + '" width="' + (11*1.2) + '" height="' + rectsize + '" fill="none" stroke="black" />';
                    } else {
                        numlines = numlines + 1.0;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (this.props.kortsluitvermogen)) + "kA</text>";
                    }
                }

                // Code om fase toe te voegen
                numlines = addFase.bind(this)(numlines, mySVG);

                // genoeg plaats voorzien aan de rechterkant en eindigen
                mySVG.xright = Math.max(mySVG.xright,20+11*(numlines-1));
                break;

            case "differentieelautomaat":

                // Code als differentieel selectief is
                if (this.props.differentieel_is_selectief) {
                    mySVG.data += '<line x1="' + mySVG.xleft + '" x2="' + mySVG.xleft + '" y1="' + mySVG.yup + '" y2="' + (mySVG.yup+30) + '" stroke="black" />'
                               +  '<rect x="' + (mySVG.xleft+7) + '" y="' + (mySVG.yup) + '" width="16" height="16" stroke="black" fill="white" />'
                               +  "<text x=\"" + (mySVG.xleft+19) + "\" y=\"" + (mySVG.yup+8) + "\"" + " transform=\"rotate(-90 " + (mySVG.xleft+19) + "," + (mySVG.yup+8) + ")" 
                               +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" + "S" + "</text>";
                    mySVG.yup += 23;
                }

                numlines = 1 + (trimString(aantalpolenamperagestr) !== '' ? 1 : 0); // Hier houden we het aantal lijnen tekst bij
                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                // Basiscode voor het amperage        
                mySVG.data += '<use xlink:href="#zekering_automatisch" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                           +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                           +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                           +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                           +  "\u0394" + htmlspecialchars(this.props.differentieel_delta_amperage + "mA") + "</text>"
                           +  "<text x=\"" + (mySVG.xleft+26) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                           +  " transform=\"rotate(-90 " + (mySVG.xleft+26) + "," + (mySVG.yup-10) + ")" 
                           +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                           +  aantalpolenamperagestr + "</text>";

                // Code om de curve toe te voegen
                if ( (this.props.curve_automaat=='B') || (this.props.curve_automaat=='C') || (this.props.curve_automaat=='D') || (this.props.curve_automaat=='U') ) {
                    ++numlines;
                    mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                               +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                               +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                               +  htmlspecialchars("Curve " + this.props.curve_automaat) + "</text>";
                }

                // Code om het type toe te voegen
                if ( ['A','B','F'].includes(this.props.type_differentieel) ) {
                    ++numlines;
                    mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                               +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                               +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                               +  htmlspecialchars("Type " + this.props.type_differentieel) + "</text>";
                }

                // Code om kortsluitvermogen toe te voegen
                if ( (this.props.kortsluitvermogen!='') ) {
                    if (this.props.huishoudelijk) {
                        numlines = numlines + 1.3;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)) + "</text>";
                        let rectsize = svgTextWidth(htmlspecialchars("" + (parseLocaleFloat(this.props.kortsluitvermogen)*1000)))+6;
                        mySVG.data += '<rect x="' + (mySVG.xleft+15+11*(numlines-2)+1) + '" y="' + (mySVG.yup-10-(rectsize/2)) + '" width="' + (11*1.2) + '" height="' + rectsize + '" fill="none" stroke="black" />';
                    } else {
                        numlines = numlines + 1.0;
                        mySVG.data += "<text x=\"" + (mySVG.xleft+15+11*(numlines-1)) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                                +  " transform=\"rotate(-90 " + (mySVG.xleft+15+11*(numlines-1)) + "," + (mySVG.yup-10) + ")" 
                                +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                                +  htmlspecialchars("" + (this.props.kortsluitvermogen)) + "kA</text>";
                    }
                }

                // Code om fase toe te voegen
                numlines = addFase.bind(this)(numlines, mySVG);

                // genoeg plaats voorzien aan de rechterkant en eindigen
                mySVG.xright = Math.max(mySVG.xright,20+11*(numlines-1));
                break;

            case "contact":
            case "zekeringscheider":

                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                mySVG.data += `<use xlink:href="${(this.props.bescherming == 'contact' ? '#zekering_empty' : '#zekeringscheider')}" `
                        +  `x="${mySVG.xleft}" y="${mySVG.yup}" />`
                        +  `<text x="${mySVG.xleft+15}" y="${mySVG.yup-10}" `
                        +  `transform="rotate(-90 ${mySVG.xleft+15},${mySVG.yup-10})" `
                        +  `style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10">`
                        +  `${aantalpolenamperagestr}</text>`;

                if (this.props.normaalGesloten) {
                    mySVG.data += `<line x1="${mySVG.xleft}" x2="${mySVG.xleft}" y1="${mySVG.yup-25.5
                    }" y2="${mySVG.yup-30}" stroke="black" />`
                               +  `<line x1="${mySVG.xleft-12}" x2="${mySVG.xleft+0.5}" y1="${mySVG.yup-25}" y2="${mySVG.yup-25}" stroke="black" />`
                }

                break;

            case "draaischakelaar":

                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de schakelaar

                mySVG.data += '<use xlink:href="#draaischakelaar_verticaal" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                        +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                        +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                        +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                        +  aantalpolenamperagestr + "</text>";
                break;

            case "schemer":

                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                mySVG.data += '<use xlink:href="#zekering_empty" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                        +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                        +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                        +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                        +  aantalpolenamperagestr + "</text>"
                        +  '<use xlink:href="#arrow" x=\"' + (mySVG.xleft-18) + '" y="' + (mySVG.yup-15) + '" />'
                        +  '<use xlink:href="#arrow" x=\"' + (mySVG.xleft-18) + '" y="' + (mySVG.yup-12) + '" />';
                break;

            case "smelt":

                numlines = (trimString(aantalpolenamperagestr) !== '' ? 1 : 0); // Hier houden we het aantal lijnen tekst bij
                mySVG.yup += 30;  // Hoeveel ruimte moeten we onderaan voorzien voor de zekering

                mySVG.data += '<use xlink:href="#zekering_smelt" x=\"' + mySVG.xleft + '" y="' + mySVG.yup + '" />'
                        +  "<text x=\"" + (mySVG.xleft+15) + "\" y=\"" + (mySVG.yup-10) + "\"" 
                        +  " transform=\"rotate(-90 " + (mySVG.xleft+15) + "," + (mySVG.yup-10) + ")" 
                        +  "\" style=\"text-anchor:middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"10\">" 
                        +  aantalpolenamperagestr + "</text>";

                // Code om fase toe te voegen
                numlines = addFase.bind(this)(numlines, mySVG);

                // Genoeg plaats voorzien aan de rechterkant en eindigen
                mySVG.xright = Math.max(mySVG.xright,20+11*(numlines-1));

                break;

            case "geen":
                mySVG.yup += 0;
                break;
        }

        const ylijn = mySVG.yup+25;
        let tellerEindX = 21+extrashift; // x waar de leiding na de teller start

        if (metTeller) {
            // Leiding helemaal links onderaan vóór de teller
            mySVG.data += '<line x1="1" ' + 'y1="' + ylijn + '" x2="' + (21+extrashift)  + '" '+ 'y2="' + ylijn + '" stroke="black"></line>';

            // Kabeltype en tekst links onderaan vóór de teller
            if (this.props.type_kabel_voor_teller != "") {
                mySVG.data += '<text x="55" y="' + (mySVG.yup+40) 
                           + '" style="text-anchor:end" font-family="Arial, Helvetica, sans-serif" font-size="10">' 
                           + htmlspecialchars(this.props.type_kabel_voor_teller) + '</text>';
            }        

            // De teller
            mySVG.data += '<use xlink:href="#elektriciteitsmeter" x="' + (21+extrashift) + '" y="' + ylijn + '"></use>';
            tellerEindX = 61+extrashift;
        } else {
            tellerEindX = 1;
        }

        // Leiding rechts onderaan na de teller
        mySVG.data += '<line x1="' + tellerEindX + '" ' + 'y1="' + ylijn + '" x2="' + (mySVG.xleft) + '" '+ 'y2="' + ylijn + '" stroke="black"></line>'
        +  '<line x1="' + (mySVG.xleft) + '" y1="' + (mySVG.yup) + '" x2="' + (mySVG.xleft) + '" ' + 'y2="' + ylijn + '" stroke="black"></line>';

        // Symbolen voor de plaatsing van de kabel na de teller
        mySVG.data += this.kabelLocatieHorizontaalSVG(tellerEindX + 12, ylijn);

        // Kabeltype en tekst rechts onderaan na de teller
        mySVG.data += '<text x="' + (tellerEindX+24) + '" y="' + (mySVG.yup+40) 
                   + '" style="text-anchor:left" font-family="Arial, Helvetica, sans-serif" font-size="10">' 
                   + htmlspecialchars(this.props.type_kabel_na_teller) + '</text>';

        // 25 extra pixels voorzien onderaan zodat de teller nooit in de tekening daaronder loopt
        mySVG.yup += 25;
        mySVG.ydown = 25;

        // Adres en tekst onder de teller (meerdere lijnen gescheiden door "|")
        if (metTeller) {
            mySVG.data += this.addAdresEnDetailsToSVG(mySVG, 41+extrashift, 5, 20+extrashift);
        } else if (!(/^\s*$/.test(this.props.adres ?? ""))) {
            mySVG.data += '<text x="' + (41+extrashift) + '" y="' + (mySVG.yup+mySVG.ydown+10) 
                       + '" style="text-anchor:middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-style="italic">' 
                       + htmlspecialchars(this.props.adres) + '</text>';
            mySVG.ydown += 15;
        }

        // Naam onderaan zetten (links-onder)
        mySVG.data += '<text x="' + (mySVG.xleft+(-6)) + '" ' + 'y="' + (mySVG.yup-10) + '" '
                + 'style="text-anchor:end" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="12"'  + '>'
                + htmlspecialchars(this.props.naam) + '</text>';

        // rework xleft and xright to ensure the entire structure is always at the right of a potential parent kring
        mySVG.xright = mySVG.xright + mySVG.xleft - 1;
        mySVG.xleft = 1;

        // Set newPage attribute if the property is true
        if (this.props.newPage) {
            mySVG.data = `<svg newPage="true" x="0" y="0" width="${mySVG.xleft + mySVG.xright}" height="${mySVG.yup + mySVG.ydown}">`+ mySVG.data + '</svg>';
        }
        
        return(mySVG);
    }

}