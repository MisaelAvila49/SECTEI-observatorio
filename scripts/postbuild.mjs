// Framework emite maximum-scale=1 (bloquea el zoom) y lang="en". Se corrige en dist/.
import {readdirSync, readFileSync, writeFileSync, statSync} from "node:fs";
import {join} from "node:path";
function* html(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* html(p);
    else if (n.endsWith(".html")) yield p;
  }
}
let n = 0;
for (const p of html("dist")) {
  const s = readFileSync(p, "utf8");
  const t = s.replace(/,\s*maximum-scale=1/g, "").replace(/<html lang="[^"]*"/, '<html lang="es"');
  if (t !== s) { writeFileSync(p, t); n++; }
}
console.log(`postbuild: ${n} páginas corregidas (zoom y lang)`);
