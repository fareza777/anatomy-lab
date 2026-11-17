// Build every system page (light + dark) into the Android assets and write the catalog.
//   node build-all.mjs            build all
//   node build-all.mjs engine     build systems whose id contains "engine"
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { labPage } from "./lab/shell.mjs";
import { CATEGORIES } from "./categories.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SYSTEMS = join(HERE, "systems");
const ASSETS = join(HERE, "..", "app", "src", "main", "assets");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const ids = readdirSync(SYSTEMS).filter((d) => existsSync(join(SYSTEMS, d, "content.json")));
const catalog = [];
const problems = [];
for (const id of ids.sort()) {
  const content = JSON.parse(readFileSync(join(SYSTEMS, id, "content.json"), "utf8"));
  if (content.id !== id) problems.push(`${id}: content.id is ${content.id}`);
  if (!CATEGORIES.some((c) => c.id === content.category)) problems.push(`${id}: unknown category ${content.category}`);
  catalog.push(content);
  if (only.length && !only.some((o) => id.includes(o))) continue;
  const mod = await import(pathToFileURL(join(SYSTEMS, id, "build.mjs")).href);
  mkdirSync(join(ASSETS, "labs", id), { recursive: true });
  for (const theme of ["light", "dark"]) {
    const t0 = Date.now();
    const fig = mod.figure(theme);
    const html = labPage({
      title: content.title,
      theme,
      plate: fig.plate,
      modes: content.modes,
      controls: content.controls,
      gauges: content.gauges,
      actions: content.actions,
      steps: content.steps,
      script: fig.script,
      css: `.iso{--fig-aspect:${(mod.WIDTH / mod.HEIGHT).toFixed(4)}}` + fig.css,
      extra: fig.extra,
      foot: content.accuracy,
      parts: content.parts,
    });
    writeFileSync(join(ASSETS, "labs", id, `${theme}.html`), html);
    console.log(`${id}/${theme}.html  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
  }
}
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
writeFileSync(join(ASSETS, "catalog.json"), JSON.stringify({ version: 1, categories: CATEGORIES, systems: catalog }, null, 1));
console.log(`catalog: ${catalog.length} systems`);
