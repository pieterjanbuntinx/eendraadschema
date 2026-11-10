// Copies the built web app (same files as the Docker image) into desktop/app.
// Run `npm run build` in the repository root first.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const target = join(here, "..", "app");

const builtIndex = join(root, "dist", "index.html");
if (!existsSync(builtIndex)) {
    console.error("dist/index.html not found: run `npm run build` in the repository root first.");
    process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const item of ["builddate.js", "css", "Documentation", "examples", "favicon.ico", "gif", "license.html", "prop", "resources"]) {
    const source = join(root, item);
    if (existsSync(source)) cpSync(source, join(target, item), { recursive: true });
}
cpSync(builtIndex, join(target, "index.html"));
console.log("Web app copied to", target);
