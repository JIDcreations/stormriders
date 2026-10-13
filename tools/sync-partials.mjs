#!/usr/bin/env node
/* Copies partials/header.html, footer.html and sprite.html into every page.
   Each page marks the spots with <!-- partial:header --> … <!-- /partial:header -->.
   Run after editing a partial:  node tools/sync-partials.mjs
   Limit to some pages:          node tools/sync-partials.mjs rulez/index.html over-ons/index.html */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const names = ["header", "footer", "sprite"];
const partials = Object.fromEntries(names.map(n => [n, readFileSync(join(root, "partials", n + ".html"), "utf8").trimEnd()]));

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    if (f.startsWith(".") || ["partials", "tools", "assets", "node_modules"].includes(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === "index.html" || f === "404.html") pages.push(p);
  }
})(root);

const only = process.argv.slice(2).map(a => a.replace(/^\.\//, ""));
for (const page of pages) {
  const rel = relative(root, page);
  if (only.length && !only.includes(rel)) continue;
  const depth = rel.split(sep).length - 1;
  const prefix = rel === "404.html" ? "/" : "../".repeat(depth);
  const section = depth === 0 ? "home" : rel.split(sep)[0] === "events" ? "events" : rel.split(sep)[0];
  let html = readFileSync(page, "utf8");
  let changed = false;
  for (const n of names) {
    const re = new RegExp(`<!-- partial:${n} -->[\\s\\S]*?<!-- /partial:${n} -->`);
    if (!re.test(html)) continue;
    let body = partials[n].replaceAll("{{root}}", prefix);
    if (n === "header") body = body.replace(`data-nav="${section}"`, `data-nav="${section}" aria-current="page"`);
    html = html.replace(re, `<!-- partial:${n} -->\n${body}\n<!-- /partial:${n} -->`);
    changed = true;
  }
  if (changed) { writeFileSync(page, html); console.log("synced", rel); }
}
