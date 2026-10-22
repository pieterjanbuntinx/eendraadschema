// Import jsPDF types if available (otherwise use 'any')
declare global {
    interface Window {
        jspdf: any;
    }
}

type PrintTable = {
    papersize: string;
    pages: { start: number; stop: number; info: string }[];
    starty: number;
    stopy: number;
};

type Properties = {
    dpi?: number;
    orientation?: string;
    control: string;
    owner: string;
    installer: string;
    info: string;
};

type SitPlanPrint = {
    numpages: number;
    pages: { svg: string; sizex: number; sizey: number }[];
};

type StatusCallback = { innerHTML: string };

export function printPDF(
    svg: string,                            // SVG van het eendraadschema
    print_table: PrintTable,                // Informatie over de paginering van het eendraadschema
    properties: Properties,                 // Extra informatie zoals eigenaar, installateur, etc.  Ook het aantal DPI
    pagerange: string,                      // Pagina's die moeten worden afgedrukt, in de vorm "1-3,5,7-9" of "1,2,3" of "1-3"
    //pages: number[] = [1],                // Pagina's die moeten worden afgedrukt, standaard is pagina 1
    filename = "eendraadschema_print.pdf",  // Filename van de PDF die gegenereerd wordt
    statuscallback: StatusCallback,         // Via deze functie wordt de voortgang doorgegeven aan een oproepend element (doorgaans GUI)
    sitplanprint: SitPlanPrint              // Informatie over het situatieschema
): void {
    /**
     * Afmetingen (in mm) van de pagina en het titelblok onderaan.
     * Het ééndraadschema kan liggend of staand afgedrukt worden, het situatieschema altijd liggend.
     */
    function maakPapier(staand: boolean): any {
        const A3 = (print_table.papersize === "A3");
        const lang = A3 ? 420 : 297, kort = A3 ? 297 : 210;
        const paperwidth = staand ? kort : lang;
        const paperheight = staand ? lang : kort;
        const paper_margin = 10;
        // Het titelblok is maximaal 277mm breed (zoals op liggend A4); op een smallere pagina vult het de volledige breedte
        const blokbreedte = Math.min(277, paperwidth - 2 * paper_margin);
        const owner_box_width = (blokbreedte >= 277 ? 80 : Math.floor(blokbreedte * 0.285));
        return {
            staand, paperwidth, paperheight, paper_margin,
            // Op staand A4 is de ruimte krap: geen extra marge boven het titelblok en een iets lagere onderste balk
            svg_padding: (staand && !A3) ? 0 : 5, //minimal size to keep below svg before the text boxes start
            drawnby_box_height: (staand && !A3) ? 4 : 5,
            owner_box_height: 30,
            owner_box_width,
            blokbreedte,
        };
    }

    const edsStaand = (properties.orientation === 'portrait');
    let paperdetails: any = maakPapier(edsStaand);

    let pages: (number | null)[];
    const totalPages = print_table.pages.length + sitplanprint.numpages;

    // Initialize all as null
    pages = Array(totalPages).fill(null);

    // Parse custom ranges
    const ranges = pagerange.split(',').map(r => r.trim());
    for (const range of ranges) {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) pages[i - 1] = i;
                }
            }
        } else {
            const pageNum = Number(range);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pages[pageNum - 1] = pageNum;
            }
        }
    }

    function svgToPng( svg: string, sizex: number, sizey: number,
             callback: (png: string, scale: number) => void ) {

        const max_height_in_mm =
            paperdetails.paperheight -
            2 * paperdetails.paper_margin -
            paperdetails.owner_box_height -
            paperdetails.drawnby_box_height -
            paperdetails.svg_padding;

        const max_width_in_mm =
            paperdetails.paperwidth - 2 * paperdetails.paper_margin;

        const dpi = properties.dpi || 300;
        const max_height_in_pixels = (max_height_in_mm / 25.4) * dpi;
        const max_width_in_pixels = (max_width_in_mm / 25.4) * dpi;

        const scale = Math.min(
            max_height_in_pixels / sizey,
            max_width_in_pixels / sizex
        );

        const scaledsvg =
            `<svg width="${sizex * scale}" height="${sizey * scale}" viewBox="0 0 ${sizex} ${sizey}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
            svg +
            "</svg>";

        const url =
            "data:image/svg+xml; charset=utf8, " +
            encodeURIComponent(scaledsvg);

        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            (canvas as any).crossOrigin = "anonymous";
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                let png: string | null = null;
                try {
                    png = canvas.toDataURL("image/png");
                } catch (e) {
                    if (img.complete) {
                        alert(
                            "Er is een element in het situatieschema dat verwijst naar een andere website en dit veroorzaakt een security-error in deze browser. Dit kan bijvoorbeeld gebeuren indien u een plattegrond gemaakt heeft met online tools zoals draw.io. Probeer uw plattegrond op te slaan in een ander formaat. Indien het probleem blijft aanhouden, contacteer ons dan via het contactformulier."
                        );
                    } else {
                        alert(
                            "Het genereren van de PDF is om onduidelijke redenen vastgelopen. Contacteer ons via het contactformulier."
                        );
                    }
                    return;
                }
                callback(png, scale);
                URL.revokeObjectURL(url);
                canvas.remove();
            }
        };
        img.onerror = function () {
            console.error("PDF: pagina kon niet omgezet worden naar een afbeelding", scaledsvg.slice(0, 500));
            statuscallback.innerHTML = "Het genereren van de PDF is mislukt: een pagina kon niet omgezet worden naar een afbeelding.";
        };
        img.src = url;
    }

    function htmlToPDFlines(doc: any, html: string, breedte: number = paperdetails.owner_box_width - 2 * 2 - 3): string[] {
        function htmlToUnicode(html: string): string {
            const tempElement = document.createElement("div");
            tempElement.innerHTML = html;
            return tempElement.textContent || tempElement.innerText || "";
        }

        let printlines: string[] = [];
        html = html.replace(/<div>/g, "");
        let lines = html.split(/<br>|<\/div>/).map(htmlToUnicode);
        for (let line of lines) {
            let wrappedlines = doc.splitTextToSize(
                line,
                breedte
            );
            printlines = printlines.concat(wrappedlines);
        }
        return printlines;
    }

    /** Papier voor een bepaalde pagina (index in de volledige lijst, 0-gebaseerd) */
    function papierVoorPagina(iter: number) {
        return maakPapier(iter < print_table.pages.length ? edsStaand : false);
    }

    function init() {
        const { jsPDF } = window.jspdf;
        const eerste = pages.findIndex((page) => page !== null);
        paperdetails = papierVoorPagina(Math.max(0, eerste));
        return new jsPDF(paperdetails.staand ? "portrait" : "landscape", "mm", (print_table.papersize === "A3" ? "a3" : "a4"), true);
    }

    function nieuwePagina(doc: any, iter: number) {
        paperdetails = papierVoorPagina(iter);
        doc.addPage((print_table.papersize === "A3" ? "a3" : "a4"), paperdetails.staand ? "portrait" : "landscape");
    }

    function addPage(doc: any, svg: string, sizex: number, sizey: number, callback: (doc: any, iter: number) => void, iter = 0) {

        svgToPng(svg, sizex, sizey, function (png, scale) {
            let canvasx = paperdetails.paperwidth - 2 * paperdetails.paper_margin;
            let canvasy = paperdetails.paperheight - 2 * paperdetails.paper_margin - paperdetails.owner_box_height - paperdetails.drawnby_box_height - paperdetails.svg_padding;

            if (sizex * sizey > 0) { //width is leading
                if (sizex / sizey > canvasx / canvasy) {
                    let max_height_in_mm = paperdetails.paperheight - 2 * paperdetails.paper_margin - paperdetails.owner_box_height - paperdetails.drawnby_box_height - paperdetails.svg_padding;
                    let shiftdown = (max_height_in_mm - (sizey / sizex) * canvasx) / 2;
                    doc.addImage(png, "PNG", paperdetails.paper_margin, paperdetails.paper_margin + shiftdown, canvasx, (sizey / sizex) * canvasx, undefined, "FAST");
                } else { //height is leading
                    doc.addImage(png, "PNG", paperdetails.paper_margin, paperdetails.paper_margin, (sizex / sizey) * canvasy, canvasy, undefined, "FAST");
                }
            }

            doc.setProperties({
                title: "Eendraadschema.pdf",
                subject: "Eendraadschema",
                author: "eendraadschema.goethals-jacobs.be",
                keywords: "eendraadschema, online",
                creator: "eendraadschema.goethals-jacobs.be",
            });

            let startx = paperdetails.paperwidth - paperdetails.paper_margin - paperdetails.blokbreedte; // Titelblok rechts onderaan

            doc.rect(startx, // Drawn by box below
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height,
                     3 * paperdetails.owner_box_width,
                     paperdetails.drawnby_box_height);
            doc.rect(startx, // first large box from left to right
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height,
                     paperdetails.owner_box_width,
                     paperdetails.owner_box_height);
            doc.rect(startx + paperdetails.owner_box_width, // second large box from left to right
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height,
                     paperdetails.owner_box_width,
                     paperdetails.owner_box_height);
            doc.rect(startx + 2 * paperdetails.owner_box_width, // third large box from left to right
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height,
                     paperdetails.owner_box_width,
                     paperdetails.owner_box_height);
            doc.rect(startx + 3 * paperdetails.owner_box_width, // Last box at the right
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height,
                     paperdetails.paperwidth - paperdetails.paper_margin - startx - 3 * paperdetails.owner_box_width,
                     paperdetails.drawnby_box_height + paperdetails.owner_box_height);

            const smal = (paperdetails.owner_box_width < 80); // smal titelblok, bvb. staand A4
            const fontSize = smal ? 7 : 8;
            const laatsteBreedte = paperdetails.paperwidth - paperdetails.paper_margin - startx - 3 * paperdetails.owner_box_width - 2 * 2 - 3;
            const y0 = paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height;
            const textHeight = fontSize * 0.352778; // 1 point = 0.352778 mm

            doc.setFont("helvetica", "bold");
            doc.setFontSize(fontSize);


            let page = iter + 1;
            let maxpages = print_table.pages.length + sitplanprint.numpages;

            doc.text("pagina. " + page + "/" + maxpages,
                     startx + 3 * paperdetails.owner_box_width + 2, //Leave 2mm at the left 
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight + 1.5);

            let pagename = iter < print_table.pages.length ? "Eendraadschema" : "Situatieschema";

            doc.text(pagename, 
                     startx + 3 * paperdetails.owner_box_width + 2, //Leave 2mm at the left 
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight * (1 + 1.2) + 1.5);
            
            const kop1 = htmlToPDFlines(doc, "Erkend Organisme");
            const kop2 = htmlToPDFlines(doc, "Plaats van de elektrische installatie");
            const kop3 = htmlToPDFlines(doc, "Installateur");
            // Inhoud begint onder de (eventueel over meerdere lijnen gesplitste) titel van het vak
            const inhoudY = (kop: string[]) => y0 - textHeight / 6 + textHeight * (1 + 1.2 * kop.length) + 1.5;
            const maxLijnen = Math.max(1, Math.floor((paperdetails.owner_box_height - 2) / (textHeight * 1.2)));

            doc.text(kop1, 
                     startx + 2,
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight + 1.5);

            doc.text(kop2, 
                     startx + paperdetails.owner_box_width + 2, 
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight + 1.5);

            doc.text(kop3, 
                     startx + 2 * paperdetails.owner_box_width + 2, 
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight + 1.5);

            doc.setFont("helvetica", "normal");

            doc.text(htmlToPDFlines(doc, properties.control).slice(0, Math.min(8, maxLijnen - kop1.length)),
                                    startx + 2 + 3,
                                    inhoudY(kop1));

            doc.text(htmlToPDFlines(doc, properties.owner).slice(0, Math.min(8, maxLijnen - kop2.length)), 
                     startx + paperdetails.owner_box_width + 2 + 3, 
                     inhoudY(kop2));

            doc.text(htmlToPDFlines(doc, properties.installer).slice(0, Math.min(8, maxLijnen - kop3.length)), 
                     startx + 2 * paperdetails.owner_box_width + 2 + 3, 
                     inhoudY(kop3));

            let info : string = (iter < print_table.pages.length ? 
                                    print_table.pages[iter].info || properties.info || "" :
                                    properties.info || "");
                                             
            let infoshorter = info.replace("https://www.eendraadschema.goethals-jacobs.be", "eendraadschema");

            doc.text(htmlToPDFlines(doc, infoshorter, smal ? laatsteBreedte + 3 : undefined).slice(0, 8), 
                     startx + 3 * paperdetails.owner_box_width + 2 + (smal ? 0 : 3),
                     paperdetails.paperheight - paperdetails.paper_margin - paperdetails.drawnby_box_height - paperdetails.owner_box_height - textHeight / 6 + textHeight * (1 + 3 * 1.2) + 1.5);

            callback(doc, iter + 1);
        });
    }

    function cropSVG(svg: string, page: number): string {
        let startx = print_table.pages[page].start;
        let width = print_table.pages[page].stop;
        let starty = print_table.starty;
        let height = print_table.stopy - starty;

        let viewbox = `${startx} ${starty} ${width} ${height}`;

        let outsvg =
            `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" transform="scale(1,1)" style="border:1px solid white" ` +
            `height="${height}" width="${width}" viewBox="${viewbox}">` +
            svg +
            "</svg>";

        return outsvg;
    }

    function nextpage(doc: any, iter = 0) {

        // Check if this is the first page we will print
        let firstpage = false;
        let idx = pages.findIndex((page) => page !== null);
        if (iter === idx) firstpage = true;
        
        if (iter < print_table.pages.length) {
            if (pages[iter] == null) {
                nextpage(doc, iter + 1);
            } else {
                statuscallback.innerHTML = "Pagina " + pages[iter] + " wordt gegenereerd. Even geduld..";

                if (!firstpage) nieuwePagina(doc, iter);

                let sizex = print_table.pages[pages[iter] - 1].stop - print_table.pages[pages[iter] - 1].start;
                let sizey = print_table.stopy - print_table.starty;

                addPage(doc, cropSVG(svg, pages[iter] - 1), sizex, sizey, nextpage, iter);
            }
        } else if (iter < pages.length) {
            if (pages[iter] == null) {
                nextpage(doc, iter + 1);
            } else {
                statuscallback.innerHTML = "Pagina " + (iter + 1) + " wordt gegenereerd. Even geduld..";

                if (!firstpage) nieuwePagina(doc, iter);

                let toprint = sitplanprint.pages[iter - print_table.pages.length];
                addPage(doc, toprint.svg, toprint.sizex, toprint.sizey, nextpage, iter);
            }
        } else {
            save(doc);
        }
    }

    function save(doc: any) {
        doc.save(filename);
        statuscallback.innerHTML = "PDF is klaar. Kijk in uw Downloads folder indien deze niet spontaan wordt geopend.";
    }

    statuscallback.innerHTML = "PDF wordt gegenereerd. Even geduld..";
    let doc = init();
    nextpage(doc, 0);
}