// Inline the Anatomy kit modules into a page. The core kit and the WebGL layer are inlined as
// globals (as the upstream examples do); lathe.mjs and tube.mjs are wrapped in namespaces
// (G and TB) because they share private helper names with the core.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = join(dirname(fileURLToPath(import.meta.url)), "..", "vendor", "anatomy", "kit");
const read = (file) => readFileSync(join(KIT, file), "utf8");

export const kitScript = () => read("iso-kit.mjs").replace(/^export /gm, "");
export const glScript = () => read("gl.mjs").replace(/^export /gm, "");

function namespaced(file, name, extra = "") {
  const src = read(file).replace(/^import [^;]+;\s*$/gm, "");
  const names = [...src.matchAll(/^export (?:function|const|let|class) ([A-Za-z0-9_$]+)/gm)].map((m) => m[1]);
  return `const ${name} = (() => {${extra}\n${src.replace(/^export /gm, "")}\nreturn { ${names.join(", ")} };\n})();\n`;
}

export const latheScript = () => namespaced("lathe.mjs", "G");
// tube.mjs reads `G` (lathe) lexically, so inline latheScript() before it.
export const tubeScript = () => namespaced("tube.mjs", "TB");
