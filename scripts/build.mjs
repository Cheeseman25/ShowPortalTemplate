// Builds the site into dist/:
//   - bundles src/main.jsx (and everything it imports) into one minified JS file
//   - compiles Tailwind + src/styles.css into one minified CSS file
//   - writes dist/index.html from src/index.html with those files linked
// Asset names include a content hash so browsers always fetch the newest version.
//
// Usage:
//   npm run build              production build (needs the Tailwind CLI from npm)
//   node scripts/build.mjs --cdn-css
//       Preview build that skips the Tailwind CLI and uses the Tailwind CDN script
//       instead (only for testing where npm isn't available).
//
// Show-specific values (title, icon, analytics, languages, colors) come from
// show/show.config.js.

import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dist = path.join(root, "dist");
const cdnCss = process.argv.includes("--cdn-css");
const SHOW = createRequire(import.meta.url)(path.join(root, "show/show.config.js"));

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });

const hashName = (base, ext, contents) =>
  `${base}-${createHash("sha256").update(contents).digest("hex").slice(0, 10)}.${ext}`;

// 1. JavaScript: JSX compiled ahead of time (no Babel in the browser).
//    React/ReactDOM stay as the global UMD builds loaded in index.html.
const js = await build({
  entryPoints: [path.join(root, "src/main.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  legalComments: "none",
  write: false,
});
const jsCode = js.outputFiles[0].contents;
const jsName = hashName("app", "js", jsCode);
fs.writeFileSync(path.join(dist, "assets", jsName), jsCode);

// 2. CSS
let stylesTag;
if (cdnCss) {
  const custom = fs.readFileSync(path.join(root, "src/styles.css"), "utf8").trim();
  const colors = { primary: SHOW.theme.primary, accent: SHOW.theme.accent, page: SHOW.theme.pageGradient };
  stylesTag =
    `<script src="https://cdn.tailwindcss.com/3.4.17"></script>\n` +
    `  <script>tailwind.config = { theme: { extend: { colors: ${JSON.stringify(colors)} } } };</script>\n` +
    `  <style type="text/tailwindcss">\n${custom}\n  </style>`;
} else {
  const tmp = path.join(dist, "styles.tmp.css");
  execFileSync(
    "npx",
    ["tailwindcss", "-c", "tailwind.config.js", "-i", "src/styles.css", "-o", tmp, "--minify"],
    { cwd: root, stdio: "inherit" }
  );
  const css = fs.readFileSync(tmp);
  fs.rmSync(tmp);
  const cssName = hashName("styles", "css", css);
  fs.writeFileSync(path.join(dist, "assets", cssName), css);
  stylesTag = `<link rel="stylesheet" href="assets/${cssName}" />`;
}

// 3. HTML shell, filled in from the show settings
const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const analytics = SHOW.analyticsId
  ? `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${SHOW.analyticsId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${SHOW.analyticsId}');
  </script>`
  : "";
const fields = {
  pageTitle: esc(SHOW.pageTitle),
  icon: esc(SHOW.icon),
  siteLanguage: SHOW.languages[0].code,
  languageCodes: SHOW.languages.map((l) => l.code).join(","),
};
let html = fs.readFileSync(path.join(root, "src/index.html"), "utf8");
html = html
  .replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in fields)) throw new Error(`unknown placeholder ${m} in index.html`);
    return fields[key];
  })
  .replace("<!--ANALYTICS-->", analytics)
  .replace("<!--TAILWIND-->", "")
  .replace("<!--STYLES-->", stylesTag)
  .replace("<!--APP-->", `<script src="assets/${jsName}"></script>`);
if (/<!--(ANALYTICS|TAILWIND|STYLES|APP)-->/.test(html)) throw new Error("unreplaced marker in index.html");
fs.writeFileSync(path.join(dist, "index.html"), html);

// 4. Static files served alongside the page: everything in public/ is copied as-is.
for (const dir of ["public", "music"]) {
  if (fs.existsSync(path.join(root, dir))) {
    fs.cpSync(path.join(root, dir), dir === "public" ? dist : path.join(dist, dir), { recursive: true });
  }
}
fs.writeFileSync(path.join(dist, ".nojekyll"), "");

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1) + " KB";
for (const f of fs.readdirSync(path.join(dist, "assets"))) {
  console.log(`dist/assets/${f}  ${kb(path.join(dist, "assets", f))}`);
}
console.log(`dist/index.html  ${kb(path.join(dist, "index.html"))}`);
