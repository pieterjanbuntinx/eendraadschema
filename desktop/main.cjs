// Electron main process for the Eendraadschema desktop app.
//
// The web app (built into ./app by scripts/copy-web.mjs) is served through a custom
// "app://" protocol instead of file://. That gives the app a stable, secure origin, so
// IndexedDB/localStorage (autosave), BroadcastChannel (linked windows) and the File
// System Access API behave exactly like in a browser. Nothing is loaded from the internet.

const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const SCHEME = "app";
const HOST = "eendraadschema";
const START_URL = `${SCHEME}://${HOST}/index.html`;
const APP_DIR = path.join(__dirname, "app");

protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

// Only one instance: a second launch (e.g. double-clicking another .eds file) is handed to the first one
if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

let mainWindow = null;
let pendingFile = null;    // { name, text } of a .eds file to open once the app has started
let rendererReady = false; // true once the web app asked for pending files (its start-up is done)

/** Finds a .eds path in a list of command line arguments. */
function edsPathFromArgs(args) {
    for (const arg of args.slice(1)) {
        if (typeof arg === "string" && arg.toLowerCase().endsWith(".eds") && fs.existsSync(arg)) return arg;
    }
    return null;
}

function readEdsFile(filePath) {
    try {
        return { name: path.basename(filePath), text: fs.readFileSync(filePath, "utf8") };
    } catch (e) {
        dialog.showErrorBox("Bestand openen", `Het bestand kon niet gelezen worden:\n${filePath}\n\n${e.message}`);
        return null;
    }
}

/** Opens a .eds file in the running app, or remembers it until the app is ready. */
function openEdsFile(filePath) {
    const file = readEdsFile(filePath);
    if (file == null) return;
    if (mainWindow && !mainWindow.isDestroyed() && rendererReady) {
        mainWindow.webContents.send("eds:open-file", file);
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    } else {
        pendingFile = file;
    }
}

const webPreferences = {
    preload: path.join(__dirname, "preload.cjs"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    plugins: true, // built-in PDF viewer for the documentation
    spellcheck: false
};

function isAppUrl(url) {
    return url.startsWith(`${SCHEME}://${HOST}/`);
}

/** Window behaviour shared by the main window and windows it opens. */
function configureWindow(win) {
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (isAppUrl(url) || url === "about:blank") {
            // Linked windows, documentation, license popup, ... stay inside the app
            return {
                action: "allow",
                overrideBrowserWindowOptions: { autoHideMenuBar: false, icon: iconPath(), webPreferences }
            };
        }
        if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) shell.openExternal(url);
        return { action: "deny" };
    });
    win.webContents.on("did-create-window", (child) => configureWindow(child));
    win.webContents.on("will-navigate", (event, url) => {
        if (!isAppUrl(url)) {
            event.preventDefault();
            if (/^https?:\/\//i.test(url)) shell.openExternal(url);
        }
    });
}

function iconPath() {
    const p = path.join(__dirname, "icon.png");
    return fs.existsSync(p) ? p : undefined;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        show: false,
        title: "Eendraadschema",
        icon: iconPath(),
        webPreferences
    });
    configureWindow(mainWindow);
    mainWindow.webContents.on("did-start-loading", () => { rendererReady = false; });
    mainWindow.once("ready-to-show", () => {
        mainWindow.maximize();
        mainWindow.show();
    });
    mainWindow.on("closed", () => { mainWindow = null; });
    mainWindow.loadURL(START_URL);
}

function buildMenu() {
    const isMac = process.platform === "darwin";
    const template = [
        ...(isMac ? [{ role: "appMenu" }] : []),
        {
            label: "Bestand",
            submenu: [
                {
                    label: "Openen...",
                    accelerator: "CmdOrCtrl+O",
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ["openFile"],
                            filters: [{ name: "Eendraadschema", extensions: ["eds"] }, { name: "Alle bestanden", extensions: ["*"] }]
                        });
                        if (!result.canceled && result.filePaths.length > 0) openEdsFile(result.filePaths[0]);
                    }
                },
                { type: "separator" },
                isMac ? { role: "close", label: "Venster sluiten" } : { role: "quit", label: "Afsluiten" }
            ]
        },
        {
            label: "Bewerken",
            submenu: [
                { role: "cut", label: "Knippen" },
                { role: "copy", label: "Kopiëren" },
                { role: "paste", label: "Plakken" },
                { role: "selectAll", label: "Alles selecteren" }
            ]
        },
        {
            label: "Beeld",
            submenu: [
                { role: "reload", label: "Herladen" },
                { type: "separator" },
                { role: "resetZoom", label: "Werkelijke grootte" },
                { role: "zoomIn", label: "Inzoomen" },
                { role: "zoomOut", label: "Uitzoomen" },
                { type: "separator" },
                { role: "togglefullscreen", label: "Volledig scherm" },
                { role: "toggleDevTools", label: "Ontwikkelaarshulpmiddelen" }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Over Eendraadschema",
                    click: () => dialog.showMessageBox(mainWindow, {
                        type: "info",
                        title: "Over Eendraadschema",
                        message: `Eendraadschema ${app.getVersion()}`,
                        detail: "Desktopversie, werkt volledig zonder internet.\nGebaseerd op de open-source eendraadschema van Ivan Goethals."
                    })
                }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// macOS delivers files through this event (also before the app is ready)
app.on("open-file", (event, filePath) => {
    event.preventDefault();
    if (app.isReady()) openEdsFile(filePath); else pendingFile = readEdsFile(filePath);
});

app.on("second-instance", (_event, argv) => {
    const filePath = edsPathFromArgs(argv);
    if (filePath) openEdsFile(filePath);
    else if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    // Serve the bundled web app; refuse anything outside the app folder
    protocol.handle(SCHEME, (request) => {
        const url = new URL(request.url);
        let relative = decodeURIComponent(url.pathname);
        if (relative === "/" || relative === "") relative = "/index.html";
        const filePath = path.normalize(path.join(APP_DIR, relative));
        if (!filePath.startsWith(APP_DIR + path.sep)) return new Response("Forbidden", { status: 403 });
        return net.fetch(pathToFileURL(filePath).toString());
    });

    ipcMain.handle("eds:get-pending-file", (event) => {
        if (mainWindow && event.sender === mainWindow.webContents) rendererReady = true;
        const file = pendingFile;
        pendingFile = null;
        return file;
    });

    const startFile = edsPathFromArgs(process.argv);
    if (startFile) pendingFile = readEdsFile(startFile);

    buildMenu();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
