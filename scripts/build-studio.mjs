// Assembles public/studio.html from src/lib/* (shell + style + core + app + supashim).
// Run after changing anything in src/lib/: `node scripts/build-studio.mjs`
//
// IMPORTANT: every String.replace() below uses a *function* as the replacement,
// not a plain string. A plain-string replacement would let JS reinterpret any
// "$1", "$&", "$'" etc. that happens to appear inside the injected source files
// (app.js/core.js are full of regex .replace(..., '$1') calls) as special
// replacement patterns, silently corrupting the output. A function replacement
// is used verbatim, which is what the original Python build scripts do for free.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '..');
const lib = p => readFileSync(path.join(root, 'src/lib', p), 'utf8');
const literal = text => () => text;

let s = lib('shell.html');
const app = lib('app.js')
  .replace('/*SPNAMES*/{}', literal(lib('spnames.json')))
  .replace('/*FRBG*/{}', literal(lib('frbg.json')));

s = s.replace('<script id="core-src">/*CORE*/', literal('<script>/*SHIM*/</script>\n<script id="core-src">/*CORE*/'));
s = s
  .replace('/*CSS*/', literal(lib('style.css')))
  .replace('/*CORE*/', literal(lib('core.js')))
  .replace('/*APP*/', literal(app))
  .replace('/*SHIM*/', literal(lib('supashim.js')))
  .replace(/\/\*LOGO\*\//g, literal('/assets/logo-white.png'));

mkdirSync(path.join(root, 'public/lib'), { recursive: true });
writeFileSync(path.join(root, 'public/lib/inter.js'), lib('inter.js'));

const head =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  '<link rel="icon" type="image/png" href="/assets/icon-black.png">' +
  '<style>body{margin:0;font-size:14px}img{max-width:100%}[hidden]{display:none!important}' +
  ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>' +
  // injects the Supabase client + config before the shim runs
  `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>` +
  `<script src="/supabase-config.js"></script>` +
  '</head><body>';

const out = head + s + '</body></html>';
mkdirSync(path.join(root, 'public'), { recursive: true });
writeFileSync(path.join(root, 'public/studio.html'), out);

const opens = (out.match(/<script/gi) || []).length;
const closes = (out.match(/<\/script/gi) || []).length;
if (opens !== closes) {
  console.error(`WARNING: <script> tag count mismatch (open=${opens}, close=${closes}) — the bundle is probably broken.`);
  process.exitCode = 1;
}
console.log('wrote public/studio.html (' + out.length + ' bytes)');
