'use strict';
/* ================================================================
   Renault Egypt After-Sales Performance Studio — application layer
   ================================================================ */
const C = window.CORE;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const groupInt = v => { const neg = v < 0; let t = String(Math.abs(v)); if (t.length > 3) { let o = ''; let k = t.length % 3 || 3; o = t.slice(0, k); for (; k < t.length; k += 3) o += ',' + t.slice(k, k + 3); t = o; } return neg ? '-' + t : t; };
const fmtInt = n => (Number.isFinite(n) ? groupInt(Math.round(n) || 0) : 'N/A');
const egp = n => (Number.isFinite(n) ? 'EGP ' + fmtInt(n) : 'N/A');
const compact = n => { if (!Number.isFinite(n)) return 'N/A'; const a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : a >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toString(); };
const egpC = n => (Number.isFinite(n) ? 'EGP ' + compact(n) : 'N/A');
const pct = x => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : 'N/A');
const achPct = x => (Number.isFinite(x) ? C.roundPct(x).toFixed(1) + '%' : 'N/A');
const ymLbl = ym => `${MON[ym % 100 - 1]} ${Math.floor(ym / 100)}`;
const dayLbl = d => (d ? `${d % 100} ${MON[Math.floor(d / 100) % 100 - 1]} ${Math.floor(d / 10000)}` : '—');
const tsLbl = t => { if (!t) return '—'; const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const chg = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? (a - b) / Math.abs(b) : NaN);
const BRANCH_ORDER = ['Abu Rawash','Obour','Kattamia','Mokattam','Mohandessin','Zayed','CFC','Madinaty','Smouha','Amerya','Assiut','Mobile Workshop','Sohag'];
const branchColor = name => { const i = BRANCH_ORDER.indexOf(name); return `var(--c${(i >= 0 ? i : (hashStr(name) % 13)) + 1})`; };
function hashStr(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
const PAGES = [
  { id: 'compare', name: 'Comparison', title: 'Comparison', ico: '⇄' },
  { id: 'overview', name: 'Overview', title: 'Network Overview', ico: '▦' },
  { id: 'ops', name: 'Operations search', title: 'Operations — Search & Analysis', ico: '⌕' },
  { id: 'vtp', name: 'Customer shows – VTP', title: 'Customer Shows — VTP Analysis', ico: '◎' },
  { id: 'alerts', name: 'Forecast & alerts', title: 'Forecast & Alerts', ico: '⚑' },
  { id: 'trends', name: 'Revenue & discount trends', title: 'Revenue & Discount Trends', ico: '⌁' },
  { id: 'branches', name: 'Branch performance', title: 'Branch Performance', ico: '▤' },
  { id: 'bays', name: 'Revenue / work bay & technician', title: 'Revenue / Work Bay & Technician', ico: '▥' },
  { id: 'parts', name: 'Parts', title: 'Parts', ico: '⚙' },
  { id: 'labour', name: 'Labour & appointments', title: 'Labour & Appointments', ico: '⏱' },
  { id: 'models', name: 'Vehicle models', title: 'Vehicle Models', ico: '◇' },
  { id: 'advisors', name: 'Service advisors', title: 'Service Advisor Performance', ico: '♙' },
  { id: 'customers', name: 'Customers & accounts', title: 'Customers & Accounts', ico: '☺' },
  { id: 'pdi', name: 'PDI & retention', title: 'PDI & Service Retention', ico: '↩' },
  { id: 'followup', name: 'Service follow-up', title: 'Service Follow-up', ico: '◷' },
  { id: 'cwdetail', name: 'Cash & warranty detail', title: 'Cash & Warranty Detail — EM and BS', ico: '⊟' },
  { id: 'focus', name: 'Focus', title: 'Focus — Key Figures and Top Parts', ico: '◉' },
  { id: 'history', name: 'History', title: 'History — Month by Month, Year by Year', ico: '⧗' },
  { id: 'output', name: 'Output (PPT & PDF)', title: 'Output — PowerPoint & PDF', ico: '⎙' },
  { id: 'data', name: 'Data & imports', title: 'Data & Imports', ico: '⇪' },
  { id: 'team', name: 'Team access', title: 'Team Access', ico: '♧' },
];
const ACT_NAMES = ['EM', 'BS', 'PDI'];

/* ======================= state ======================= */
const A = {
  caps: {}, cloud: 'connecting', canEdit: false, isOwner: false, me: null, myId: null,
  imports: [], importsLoaded: false, cfg: C.DEFAULT_CONFIG(), cfgLoaded: false, audit: [], members: [],
  assetCache: new Map(), S: null, T: null, schedules: [], coverage: new Set(), loadErr: [],
  page: 0, f: { s: null, e: null, group: 'month', branch: 'all', act: 'all', pay: 'all', noOW: false }, fBy: {}, fPid: null, tabCmp: {}, mode: 'combined', chosen: null,
  trendGran: 'month', ret: { q: 4, type: 'mechanical' }, advScope: 'all', vtpDim: 'plant', fr: { cur: null, prev: null, n: 1 }, partsNoSvc: false, advCard: null, views: [], cmp: { mode: 'periods', ptype: 'quarter', a: null, b: null, branches: new Set(), months: new Set(), noPdi: false }, out: { text: '', title: 'After-Sales Performance Review', by: '', cover: true, contents: true, closing: true, notes: true }, fuStatus: 'overdue', modelsAll: false,
  staging: [], stagingConfirm: false, drive: { list: null, busy: false, err: '' }, confirmDel: null, editTarget: null,
  busy: null, scopeBranches: null, scopeLabel: 'Full network', local: false, names: new Map(), memHits: [], memPick: null,
};
try { const p = localStorage.getItem('ps.page'); if (p) A.page = Math.max(0, PAGES.findIndex(x => x.id === p)); } catch (e) {}
try { const fb = JSON.parse(localStorage.getItem('ps.fBy') || 'null'); if (fb && typeof fb === 'object') for (const k in fb) if (fb[k] && typeof fb[k] === 'object') A.fBy[k] = Object.assign({ group: 'month', branch: 'all', act: 'all', pay: 'all', noOW: false }, fb[k]); } catch (e) {}
const hashPage = (location.hash || '').slice(1); if (hashPage) { const i = PAGES.findIndex(x => x.id === hashPage); if (i >= 0) A.page = i; }
const isAdmin = () => A.canEdit || A.cloud === 'off';

/* ======================= small UI helpers ======================= */
let toastTimer = null;
function toast(msg, err) { let t = $('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, err ? 7000 : 3500); }
function setBusy(msg, pctv) { A.busy = msg ? { msg, pct: pctv } : null; let b = $('busy'); if (!msg) { if (b) b.hidden = true; return; } if (!b) { b = document.createElement('div'); b.id = 'busy'; b.className = 'busy'; b.setAttribute('role', 'status'); document.body.appendChild(b); } b.hidden = false; b.innerHTML = `<i class="spin"></i><span>${esc(msg)}${pctv != null ? ` · ${Math.round(pctv * 100)}%` : ''}</span>`; }
const yieldUI = () => new Promise(r => setTimeout(r, 0));
const loadedScripts = new Map();
function loadScript(src) { if (loadedScripts.has(src)) return loadedScripts.get(src); const p = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); loadedScripts.set(src, p); return p; }
const LIB = {
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  pptx: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  inter: '',
};

/* ======================= local cache (IndexedDB) ======================= */
const IDB = {
  db: null,
  async open() { if (this.db !== null) return this.db; try { this.db = await new Promise((res, rej) => { const r = indexedDB.open('ps-cache', 1); r.onupgradeneeded = () => r.result.createObjectStore('a'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { this.db = false; } return this.db; },
  async get(k) { const d = await this.open(); if (!d) return null; return new Promise(res => { try { const q = d.transaction('a').objectStore('a').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); },
  async set(k, v) { const d = await this.open(); if (!d) return; try { d.transaction('a', 'readwrite').objectStore('a').put(v, k); } catch (e) {} },
  async del(k) { const d = await this.open(); if (!d) return; try { d.transaction('a', 'readwrite').objectStore('a').delete(k); } catch (e) {} },
};

/* ======================= cloud ======================= */
async function initCloud() {
  const use = n => (window.claude && window.claude.use ? window.claude.use(n).catch(() => null) : Promise.resolve(null));
  const [db, assets, user, downloads, mcp] = await Promise.all(['db', 'assets', 'user', 'downloads', 'mcp'].map(use));
  A.caps = { db, assets, user, downloads, mcp };
  if (user) {
    try { A.canEdit = !!(await user.canEdit()); } catch (e) {}
    try { A.isOwner = !!(await user.isOwner()); } catch (e) {}
    try { A.me = await user.me(); } catch (e) {}
    try { A.myId = await user.id(); } catch (e) {}
  }
  if (!db) { A.cloud = 'off'; A.local = true; A.importsLoaded = true; A.cfgLoaded = true; scheduleRebuild(); return; }
  A.cloud = 'live';
  db.collection('imports').onSnapshot(snap => { A.imports = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); A.importsLoaded = true; scheduleRebuild(); }, e => { A.cloud = 'error'; A.cloudErr = e && e.message; render(); });
  db.doc('config/main').onSnapshot(d => { { const sv = d.exists ? d.data() : {}; A.cfg = Object.assign(C.DEFAULT_CONFIG(), sv); A.cfg.capacity = Object.assign({}, C.DEFAULT_CONFIG().capacity, sv.capacity || {}); } A.cfgLoaded = true; scheduleRebuild(); }, () => { A.cfgLoaded = true; scheduleRebuild(); });
  db.collection('audit').orderBy('at', 'desc').limit(60).onSnapshot(snap => { A.audit = snap.docs.map(d => d.data()); if (PAGES[A.page].id === 'data') render(); }, () => {});
  db.collection('views').onSnapshot(snap => { A.views = snap.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => (a.name || '').localeCompare(b.name || '')); if (PAGES[A.page].id === 'output') render(); }, () => {});
  db.collection('members').onSnapshot(async snap => { A.members = snap.docs.map(d => Object.assign({ id: d.id }, d.data())); applyScope(); await resolveNames(A.members.map(m => m.uid).filter(Boolean)); if (A.S) render(); else scheduleRebuild(); }, () => {});
  render();
}
function applyScope() {
  A.scopeBranches = null; A.scopeLabel = 'Full network';
  if (A.canEdit) { A.scopeLabel = 'Administrator · full network'; return; }
  const m = A.myId ? A.members.find(x => x.uid === A.myId) : null;
  if (m && Array.isArray(m.scope) && m.scope.length) { A.scopeBranches = new Set(m.scope); A.scopeLabel = 'Member · ' + m.scope.join(', '); }
  else if (m) A.scopeLabel = 'Member · full network';
  else A.scopeLabel = 'Viewer · full network';
}
async function resolveNames(ids) {
  const u = A.caps.user; if (!u || !ids.length) return;
  try { const ps = await u.profiles(ids); for (const id of ids) if (ps && ps[id]) A.names.set(id, ps[id].name || ''); } catch (e) {}
}
async function audit(action, detail) {
  const rec = { at: Date.now(), action, detail: String(detail).slice(0, 500), by: A.myId || null, byName: (A.me && A.me.name) || '' };
  if (A.local) { A.audit.unshift(rec); return; }
  try { await A.caps.db.collection('audit').doc(`${rec.at}-${Math.random().toString(36).slice(2, 8)}`).set(rec); } catch (e) {}
}
let cfgQueue = Promise.resolve();
const capFocused = () => { const ae = document.activeElement; return !!(ae && ae.dataset && (ae.dataset.cap || ae.dataset.caph || ae.dataset.pname != null)); };
let capTimer = null;
function capRenderSoon() { clearTimeout(capTimer); capTimer = setTimeout(() => { if (capFocused()) capRenderSoon(); else render(); }, 700); }
/* per-year target adjustment: changes the target only, actuals stay as invoiced */
function targetAdjBox(admin) {
  const docs = A.imports.filter(d => d.kind === 'target');
  const years = [...new Set(docs.map(d => +String(d.period).slice(0, 4)))].filter(Boolean).sort();
  if (!years.length) return '';
  const adj = A.cfg.targetAdj || {}, scale = Number(A.cfg.targetScale) || 1;
  const rows = years.map(y => {
    const a = adj[y] || { mode: 'none', pct: 0 };
    let rep = 0, used = 0, n = 0;
    for (const d of docs) if (+String(d.period).slice(0, 4) === y) { n++; const ym = C.ymFromStr(d.period), tf = C.targetFactor(A.cfg, ym); for (const e of d.entries || []) if (e.budget != null && C.resolveTargetRow(e.raw, A.cfg).unit) { rep += e.budget * scale; used += e.budget * scale * tf; } }
    const sel = `<select class="cell" data-tadj="mode" data-y="${y}" ${admin ? '' : 'disabled'} aria-label="Adjustment for ${y}">${[['none', 'No change'], ['inc', 'Increase target by'], ['dec', 'Decrease target by'], ['remove', 'Remove an added uplift of']].map(([v, l]) => `<option value="${v}" ${a.mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const inp = `<input class="cell" type="number" step="0.1" min="0" max="100" style="width:80px" data-tadj="pct" data-y="${y}" value="${a.mode === 'none' ? '' : Number(a.pct) || ''}" ${admin && a.mode !== 'none' ? '' : 'disabled'} aria-label="Percent for ${y}"> %`;
    // months: which ones the adjustment applies to; months whose file carries a built-in uplift are marked
    const have = new Map(); for (const d of docs) if (+String(d.period).slice(0, 4) === y) have.set(+String(d.period).slice(5, 7), C.detectUplift(d.entries));
    const on = Array.isArray(a.months) ? new Set(a.months) : null;
    const det = [...have].filter(([, u]) => u > 0);
    const mths = `<div style="display:flex;flex-wrap:wrap;gap:4px;max-width:420px">${MON.map((mn, k) => { const m = k + 1, h = have.has(m), u = have.get(m) || 0; return `<label class="mini" style="display:inline-flex;align-items:center;gap:2px;padding:2px 5px;border:1px solid var(--line);border-radius:6px;${h ? '' : 'opacity:.4'}${u ? ';background:var(--yellow-soft,#fff6c2)' : ''}" title="${h ? (u ? `${mn} ${y}: the file's budgets carry a built-in +${Math.round(u * 100)}%` : `${mn} ${y}: no built-in uplift found`) : `No target file for ${mn} ${y}`}"><input type="checkbox" data-tadjm="${m}" data-y="${y}" ${(!on || on.has(m)) ? 'checked' : ''} ${admin && a.mode !== 'none' && h ? '' : 'disabled'}>${mn}${u ? '*' : ''}</label>`; }).join('')}</div>${det.length ? `<div class="mini" style="margin-top:4px">* built-in +${Math.round(det[0][1] * 100)}% found in ${det.map(([m]) => MON[m - 1]).join(', ')}${admin ? ` <button class="btn small secondary" data-act="tadjdet" data-y="${y}" data-m="${det.map(([m]) => m).join(',')}" data-p="${Math.round(det[0][1] * 1000) / 10}">Remove it from these months only</button>` : ''}</div>` : ''}`;
    return [String(y), fmtInt(n), sel, inp, mths, egpC(rep), `<b>${egpC(used)}</b>`, used && rep ? pct(used / rep - 1) : '—'];
  });
  return `<details class="box" open><summary>Target adjustment by year</summary><p class="desc">Raise or lower the target of a whole year by a percentage. Only the target changes (branch, labour, parts, other and DSR budget lines); actual revenue is never changed. “Remove an added uplift” divides the target by (1 + %): use it when a year’s target was inflated, e.g. a 10% uplift → enter 10 (the same as a 9.09% decrease). The change applies to every tab, the comparison and the PowerPoint/PDF, and is saved for everyone.</p>${table(['Year', 'Target files', 'Adjustment', '%', 'Months it applies to', 'Target as reported', 'Target used', 'Change'], rows, { align: ['', 'num', '', '', '', 'num', 'num', 'num'] })}</details>`;
}
function saveTargetAdj(y, mode, pctV, months) {
  const adj = Object.assign({}, A.cfg.targetAdj || {});
  if (mode === 'none' || !(pctV > 0)) delete adj[y]; else { adj[y] = { mode, pct: Math.min(100, pctV) }; if (Array.isArray(months) && months.length < 12) adj[y].months = months.slice().sort((a, b) => a - b); }
  A.cfg.targetAdj = adj;
  A.T = C.buildTargets(A.imports.filter(d => d.kind === 'target').map(d => Object.assign({ id: d.id }, d)), A.cfg, A.S);
  const lbl = mode === 'none' || !(pctV > 0) ? `Target ${y}: no adjustment` : `Target ${y}: ${({ inc: 'increase by', dec: 'decrease by', remove: 'remove an uplift of' })[mode]} ${pctV}%${adj[y].months ? ' (' + adj[y].months.map(m => MON[m - 1]).join(', ') + ')' : ''}`;
  saveConfig({ targetAdj: adj }, lbl, true); render();
}
/* spare parts list: every part number of the period with its name, as an Excel file (also the template for uploading names) */
/* Excel rows for part numbers: the selected period, the same months one and two years earlier (with the change), then revenue and units in every branch */
/* the models a part was fitted to in the selected period, biggest share of units first: [[model, share], …] */
function partModels(o) { if (!o || !o.mo) return []; let t = 0; for (const v of o.mo.values()) t += v; return [...o.mo].filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).map(([m, v]) => [A.S.models[m] || '—', t ? v / t : 0]); }
function partYearRows(list) {
  const S = A.S, Y = A._partsYears || { Y0: new Map(), Y1: new Map(), Y2: new Map(), lbl: ['', '', ''] }, z = { n: 0, q: 0, cn: 0, cq: 0, wn: 0, wq: 0 };
  const brs = []; { const seen = new Set(); for (const x of list) { const o = Y.Y0.get(x.m); if (o && o.br) for (const b of o.br.keys()) seen.add(b); } brs.push(...[...seen].sort((a, b) => branchSort(S.branches[a], S.branches[b]))); }
  const yrs = [0].concat(Y.has1 ? [1] : []).concat(Y.has2 ? [2] : []);
  const head = ['Part number', 'Name', `Models ${Y.lbl[0]} (share of units)`].concat(yrs.flatMap(k => (k ? [`Units ${Y.lbl[k]}`, `Cash units ${Y.lbl[k]}`, `Warranty units ${Y.lbl[k]}`] : [`Revenue ${Y.lbl[k]} (EGP)`, `Units ${Y.lbl[k]}`, `Cash ${Y.lbl[k]} (EGP)`, `Cash units ${Y.lbl[k]}`, `Warranty ${Y.lbl[k]} (EGP)`, `Warranty units ${Y.lbl[k]}`]).concat(yrs.includes(k + 1) ? [`Units change vs ${Y.lbl[k + 1]}`] : []))).concat(brs.flatMap(b => [`${S.branches[b]} units ${Y.lbl[0]}`].concat(Y.has1 ? [`${S.branches[b]} units change vs ${Y.lbl[1]}`] : [])));
  const r0 = v => Math.round(v || 0), q2 = v => Math.round((v || 0) * 100) / 100, ch = (a, b) => (b && b.q ? a.q / b.q - 1 : '');
  const rows = list.map(x => { const ys = [Y.Y0, Y.Y1, Y.Y2].map(m => m.get(x.m) || z); return [x.code, partName(x.code), partModels(ys[0]).filter(e => e[1] >= 0.005).slice(0, 8).map(([m, sh]) => `${m} ${Math.round(sh * 100)}%`).join(', ')].concat(yrs.flatMap(k => (k ? [q2(ys[k].q), q2(ys[k].cq), q2(ys[k].wq)] : [r0(ys[k].n), q2(ys[k].q), r0(ys[k].cn), q2(ys[k].cq), r0(ys[k].wn), q2(ys[k].wq)]).concat(yrs.includes(k + 1) ? [ch(ys[k], ys[k + 1])] : []))).concat(brs.flatMap(b => { const v = ys[0].br && ys[0].br.get(b), w = ys[1].br && ys[1].br.get(b); return [v ? q2(v.q) : ''].concat(Y.has1 ? [v && w && w.q ? v.q / w.q - 1 : ''] : []); })); });
  const groups = ['id', 'id', 'id'].concat(yrs.flatMap(k => { const g = ['cur', 'y1', 'y2'][k]; return Array((k ? 3 : 6) + (yrs.includes(k + 1) ? 1 : 0)).fill(g); })).concat(brs.flatMap((b, j) => Array(Y.has1 ? 2 : 1).fill(j % 2 ? 'brB' : 'brA')));
  return { head, rows, groups, brs, yrs };
}
/* the part list Excel: Renault colours, a band over each column group, light row stripes, green/red changes, and a real Excel table */
const XL_PAL = { id: ['FF1F1F1F', 'FFFFFFFF', 'FFFFFFFF', 'FFF4F4F4'], cur: ['FFEFDF00', 'FF000000', 'FFFFFCE6', 'FFFFF5C2'], y1: ['FF8C8C8C', 'FFFFFFFF', 'FFFFFFFF', 'FFF2F2F2'], y2: ['FFBFBFBF', 'FF000000', 'FFFFFFFF', 'FFF2F2F2'], brA: ['FF3E5C76', 'FFFFFFFF', 'FFF2F7FB', 'FFE3EDF6'], brB: ['FF5F7F99', 'FFFFFFFF', 'FFFFFFFF', 'FFEEF2F6'],
  /* key figures: same period last year in purple, the whole last year in green */
  ly: ['FFB3A2C7', 'FFFFFFFF', 'FFFFFFFF', 'FFE6E0EC'], fy: ['FFC3D69B', 'FF000000', 'FFFFFFFF', 'FFEBF1DE'] };
async function themePartsXlsx(blob, T, groups, bands) {
  if (!window.JSZip) await loadScript(LIB.jszip);
  const z = await window.JSZip.loadAsync(await blob.arrayBuffer());
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // fonts: 0 normal, 1 title, 2 note, 3 bold black, 4 bold white, 5 green, 6 red, 7 bold normal
  const fonts = [['', '10', 'FF000000'], ['<b/>', '14', 'FF000000'], ['', '9', 'FF6E6E6E'], ['<b/>', '10', 'FF000000'], ['<b/>', '10', 'FFFFFFFF'], ['<b/>', '10', 'FF1E8E3E'], ['<b/>', '10', 'FFD93025'], ['<b/>', '10', 'FF000000']];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], fillIx = new Map();
  const fill = rgb => { if (!fillIx.has(rgb)) { fillIx.set(rgb, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`); } return fillIx.get(rgb); };
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], xfIx = new Map();
  const xf = (num, font, fl, border, al) => { const k = [num, font, fl, border, al].join('|'); if (!xfIx.has(k)) { xfIx.set(k, xfs.length); xfs.push(`<xf numFmtId="${num}" fontId="${font}" fillId="${fl}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${al ? ` applyAlignment="1"><alignment ${al}/></xf>` : '/>'}`); } return xfIx.get(k); };
  const sTitle = xf(0, 1, 0, 0, ''), sNote = xf(0, 2, 0, 0, '');
  const S = new Map(); // cell ref -> style
  const col = c => window.XLSX.utils.encode_col(c);
  const head = T.head, R0 = 4; // header on Excel row 4, band on row 3
  S.set('A1', sTitle); S.set('A2', sNote);
  head.forEach((h, c) => { const p = XL_PAL[groups[c]], white = p[1] === 'FFFFFFFF'; S.set(`${col(c)}3`, xf(0, white ? 4 : 3, fill(p[0]), 1, 'horizontal="center" vertical="center"')); S.set(`${col(c)}${R0}`, xf(0, white ? 4 : 3, fill(p[0]), 1, `horizontal="${c < 2 ? 'left' : 'center'}" vertical="center" wrapText="1"`)); });
  T.rows.forEach((r, i) => { const zb = i % 2; r.forEach((v, c) => { const p = XL_PAL[groups[c]], fl = fill(p[2 + zb]), isCh = /change/.test(head[c]); let s;
    if (typeof v !== 'number') s = xf(0, c === 0 ? 7 : 0, fl, 1, isCh ? 'horizontal="center"' : '');
    else if (isCh) s = xf(166, v > 0.0005 ? 5 : v < -0.0005 ? 6 : 0, fl, 1, 'horizontal="center"');
    else s = xf(Number.isInteger(v) ? 3 : 4, 0, fl, 1, ''); S.set(`${col(c)}${R0 + 1 + i}`, s); }); });
  const st = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="166" formatCode="+0.0%;-0.0%;0.0%"/></numFmts><fonts count="${fonts.length}">${fonts.map(f => `<font>${f[0]}<sz val="${f[1]}"/><color rgb="${f[2]}"/><name val="Inter"/></font>`).join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  z.file('xl/styles.xml', st);
  const sn = 'xl/worksheets/sheet1.xml'; let x = await z.file(sn).async('string');
  x = x.replace(/<c r="([A-Z]+\d+)"( s="\d+")?/g, (m, ref) => (S.has(ref) ? `<c r="${ref}" s="${S.get(ref)}"` : `<c r="${ref}"`));
  x = x.replace('<row r="3"', '<row r="3" ht="22" customHeight="1"').replace('<row r="4"', '<row r="4" ht="46" customHeight="1"').replace('<row r="1"', '<row r="1" ht="24" customHeight="1"');
  x = x.replace(/<sheetView workbookViewId="0"\/>/, '<sheetView workbookViewId="0" showGridLines="0" zoomScale="90" zoomScaleNormal="90"><pane xSplit="2" ySplit="4" topLeftCell="C5" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="C5" sqref="C5"/></sheetView>');
  const last = `${col(head.length - 1)}${R0 + T.rows.length}`;
  x = x.replace(/<autoFilter[^>]*\/>/, '');
  x = xlInline(x);
  // a real Excel table over the header and the rows: filter buttons, sorting, and it grows with the data
  x = x.replace(/<\/worksheet>$/, '<tableParts count="1"><tablePart r:id="rIdTbl1"/></tableParts></worksheet>');
  z.file(sn, x);
  const tbl = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="SpareParts" displayName="SpareParts" ref="A${R0}:${last}" totalsRowShown="0"><autoFilter ref="A${R0}:${last}"/><tableColumns count="${head.length}">${head.map((h, c) => `<tableColumn id="${c + 1}" name="${xe(h)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>`;
  z.file('xl/tables/table1.xml', tbl);
  z.file('xl/worksheets/_rels/sheet1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdTbl1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>');
  let ct = await z.file('[Content_Types].xml').async('string');
  ct = ct.replace('</Types>', '<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>');
  z.file('[Content_Types].xml', ct);
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* part numbers ticked in 9.23, kept in this browser */
function partSel() { if (!A._psel) { try { A._psel = new Set(JSON.parse(localStorage.getItem('ps.partSel') || '[]')); } catch (e) { A._psel = new Set(); } } return A._psel; }
function partSelSave() { try { localStorage.setItem('ps.partSel', JSON.stringify([...partSel()])); } catch (e) {} }
async function partsXlsx() {
  const m = A._partsCsv || []; if (!m.length) return toast('No part numbers for these filters.', true);
  setBusy('Building the part list');
  try {
    if (!window.XLSX) await loadScript(LIB.xlsx); const X = window.XLSX;
    const T = partYearRows(m), head = T.head, rows = T.rows;
    // row 3: a band over each group of columns (the part, each year, each branch), merged across the group
    const Yl = A._partsYears.lbl, band = [], merges = []; let c0 = 0;
    for (let c = 0; c <= head.length; c++) { if (c === head.length || (c > c0 && (T.groups[c] !== T.groups[c0] || (/^br/.test(T.groups[c]) && !/change/.test(head[c]))))) { const g = T.groups[c0]; const t = g === 'id' ? 'Part' : g === 'cur' ? Yl[0] : g === 'y1' ? Yl[1] : g === 'y2' ? Yl[2] : head[c0].replace(/ units .*$/, ''); band[c0] = t; for (let j = c0 + 1; j < c; j++) band[j] = ''; if (c - c0 > 1) merges.push({ s: { r: 2, c: c0 }, e: { r: 2, c: c - 1 } }); c0 = c; } }
    const ws = X.utils.aoa_to_sheet([[`Spare parts — ${ymLbl(A.f.s)} to ${ymLbl(A.f.e)} · ${scopeText()} · ${fmtInt(rows.length)} part numbers`], ['To name parts in bulk: type the names in column B and upload this file with “Upload part names (Excel)” on the Parts tab. Green = up, red = down.'], band, head].concat(rows));
    ws['!merges'] = merges;
    rows.forEach((r, i) => r.forEach((v, c) => { if (c < 2 || typeof v !== 'number') return; const a = X.utils.encode_cell({ r: i + 4, c }); if (ws[a]) ws[a].z = /change/.test(head[c]) ? '+0.0%;-0.0%' : /units/i.test(head[c]) ? '#,##0.##' : '#,##0'; }));
    ws['!cols'] = head.map((h, c) => ({ wch: c === 0 ? 18 : c === 1 ? 32 : c === 2 ? 34 : /change/.test(h) ? 13 : /EGP/.test(h) ? 16 : 13 }));
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Spare parts');
    let blob = new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    try { blob = await themePartsXlsx(blob, T, T.groups); } catch (e) { console.warn('Excel colours skipped', e); }
    setBusy(null); await saveFile(`Spare parts ${ymLbl(A.f.s)}-${ymLbl(A.f.e)}.xlsx`, blob);
  } catch (e) { setBusy(null); console.error(e); toast('Could not build the part list: ' + (e.message || e), true); }
}
/* upload part names: any sheet with a part-number column and a name column; the first such sheet is used */
/* advisor IDs from an Excel: a name column + an ID column (header found by name) → the advisor code list */
async function uploadAdvisorIds(file) {
  setBusy('Reading advisor IDs');
  try {
    if (!window.XLSX) await loadScript(LIB.xlsx); const X = window.XLSX;
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    let found = null;
    for (const sn of wb.SheetNames) {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
      for (let h = 0; h < Math.min(rows.length, 15) && !found; h++) {
        const hd = (rows[h] || []).map(c => String(c).toLowerCase().trim());
        const ii = hd.findIndex(c => /dms code|adviser id|advisor id|employee id|staff id|^id$|^code$|sap|كود|رقم/.test(c)), ni = hd.findIndex((c, j) => j !== ii && /advis[eo]r name|adviser|advisor|^name$|اسم/.test(c));
        if (ii >= 0 && ni >= 0) found = { rows: rows.slice(h + 1), ii, ni };
      }
      if (found) break;
    }
    setBusy(null);
    if (!found) return toast(`No advisor-name and ID columns found in “${file.name}”. Use headers like “Advisor name” and “DMS code” (or “ID”).`, true);
    const p = Object.assign({}, A.cfg.advisers || {}); let added = 0, changed = 0, same = 0, empty = 0;
    for (const r of found.rows) {
      const id = String(r[found.ii] || '').trim().replace(/\.0+$/, ''), nm = String(r[found.ni] || '').trim();
      if (!nm) continue; if (!id || /not in data/i.test(id)) { empty++; continue; }
      if (!/^[A-Za-z0-9._-]{1,20}$/.test(id) || nm.length > 60) continue;
      if (p[id] === nm) { same++; continue; }
      if (p[id]) changed++; else added++;
      p[id] = nm;
    }
    if (!added && !changed) return toast(same ? `No new IDs: the ${same} IDs in “${file.name}” are already saved${empty ? `; ${empty} advisors have no ID in the file` : ''}.` : `No advisor IDs found in “${file.name}”${empty ? ` (${empty} advisors have an empty ID)` : ''}.`, !same);
    await saveConfig({ advisers: p }, `${added + changed} advisor IDs from ${file.name} (${added} new, ${changed} changed${empty ? `, ${empty} without an ID` : ''})`);
  } catch (e) { setBusy(null); console.error(e); toast('Could not read the file: ' + (e.message || e), true); }
}
async function uploadPartNames(file) {
  setBusy('Reading part names');
  try {
    if (!window.XLSX) await loadScript(LIB.xlsx); const X = window.XLSX;
    const wb = X.read(await file.arrayBuffer(), { type: 'array' });
    let found = null;
    for (const sn of wb.SheetNames) {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
      for (let h = 0; h < Math.min(rows.length, 15) && !found; h++) {
        const hd = (rows[h] || []).map(c => String(c).toLowerCase());
        const ci = hd.findIndex(c => /part\s*(no|number|#)|material|^code$|part code|رقم/.test(c)), ni = hd.findIndex((c, j) => j !== ci && /name|description|desc|اسم|الصنف|بيان/.test(c));
        if (ci >= 0 && ni >= 0) found = { rows: rows.slice(h + 1), ci, ni, sheet: sn };
      }
      if (found) break;
    }
    if (!found) { const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); found = { rows, ci: 0, ni: 1, sheet: wb.SheetNames[0], guessed: true }; }
    const names = Object.assign({}, A.cfg.partNames || {}); let added = 0, changed = 0, same = 0, known = 0;
    const inData = new Set(A.S && A.S.mats ? A.S.mats : []);
    for (const r of found.rows) {
      const code = String(r[found.ci] || '').trim().toUpperCase(), nm = String(r[found.ni] || '').trim();
      if (!code || !nm || !/[A-Z0-9]/.test(code) || nm.length > 120) continue;
      if (inData.has(code)) known++;
      if (names[code] === nm || (!names[code] && SP_NAMES[code] === nm)) { same++; continue; }
      if (names[code]) changed++; else added++;
      names[code] = nm;
    }
    setBusy(null);
    if (!added && !changed) return toast(same ? `No new names: all ${same} names in “${file.name}” are already saved.` : `No part numbers with names found in “${file.name}”. Use a sheet with a part-number column and a name column.`, !same);
    await saveConfig({ partNames: names }, `${added + changed} part names from ${file.name} (${added} new, ${changed} changed${known < added + changed ? `, ${added + changed - known} not in the current data yet` : ''})`, true);
    render();
  } catch (e) { setBusy(null); console.error(e); toast('Could not read the file: ' + (e.message || e), true); }
}
function saveConfig(patch, label, quiet) {
  Object.assign(A.cfg, patch);
  if (quiet) capRenderSoon(); else scheduleRebuild();
  if (A.local) return Promise.resolve();
  cfgQueue = cfgQueue.then(async () => { try { await A.caps.db.doc('config/main').set(JSON.parse(JSON.stringify(A.cfg))); if (label) { audit('Mapping changed', label); toast('Saved: ' + label); } } catch (e) { toast('Could not save settings: ' + (e.message || e.code), true); } });
  return cfgQueue;
}

/* ======================= data build ======================= */
let rebuildTimer = null;
function scheduleRebuild() { clearTimeout(rebuildTimer); rebuildTimer = setTimeout(rebuild, 60); }
async function fetchAsset(id) {
  if (A.assetCache.has(id)) return A.assetCache.get(id);
  let v = await IDB.get(id);
  if (!v) {
    const r = await fetch('/_blob/' + id);
    if (!r.ok) throw new Error(`Stored file ${id.slice(0, 8)}… could not be read (HTTP ${r.status}).`);
    v = await r.json();
    IDB.set(id, v);
  }
  A.assetCache.set(id, v);
  return v;
}
let rebuildSeq = 0;
let lastBuildKey = '';
async function rebuild() {
  if (!A.importsLoaded || !A.cfgLoaded) { render(); return; }
  // nothing that feeds the numbers changed (e.g. a routine refresh): just redraw
  let bkey = ''; try { bkey = JSON.stringify([A.imports, A.cfg], (k, v) => (k === '_local' && v ? Object.keys(v).join(',') : k === 'capacity' || k === 'capHours' || k === 'partNames' || k === 'targetAdj' ? undefined : v)); } catch (e) { bkey = String(Math.random()); }
  if (A.S && bkey === lastBuildKey && !(A.loadErr && A.loadErr.length)) { if (capFocused()) capRenderSoon(); else render(); return; }
  const seq = ++rebuildSeq;
  const txn = A.imports.filter(d => d.kind === 'txn');
  // fast start: the store built last time on this device, if the saved files and settings are the same
  if (!A.S && !A.local && STORE_VERSION) {
    let snap = null; try { snap = await IDB.get('store-snapshot'); } catch (e) {}
    if (seq !== rebuildSeq) return;
    if (snap && snap.v === STORE_VERSION && snap.key === bkey && snap.S && snap.S.n) {
      A.S = snap.S; A.T = snap.T; lastBuildKey = bkey; if (!A.T || A.T.adjKey !== JSON.stringify(A.cfg.targetAdj || {})) A.T = C.buildTargets(A.imports.filter(d => d.kind === 'target').map(d => Object.assign({ id: d.id }, d)), A.cfg, A.S);
      A.schedules = A.imports.filter(d => d.kind === 'schedule').flatMap(d => d.models || []);
      afterBuild(txn); return;
    }
  }
  const need = txn.flatMap(d => d.assetIds || []).filter(id => !A.assetCache.has(id) && !/^local-/.test(id));
  A.loadErr = [];
  if (need.length) {
    let done = 0;
    setBusy(`Loading saved transaction data (${need.length} file${need.length > 1 ? 's' : ''})`, 0);
    await Promise.all(need.map(async id => { try { await fetchAsset(id); } catch (e) { A.loadErr.push(e.message); } done++; setBusy(`Loading saved transaction data`, done / need.length); }));
    setBusy(null);
  }
  if (seq !== rebuildSeq) return;
  const assets = [];
  for (const d of txn) for (const id of d.assetIds || []) { const a = A.assetCache.get(id) || (d._local && d._local[id]); if (a) assets.push(Object.assign({ _src: d.id }, a)); }
  A.schedules = A.imports.filter(d => d.kind === 'schedule').flatMap(d => d.models || []);
  A.S = C.buildStore(assets, A.cfg, A.schedules); lastBuildKey = bkey;
  A.T = C.buildTargets(A.imports.filter(d => d.kind === 'target').map(d => Object.assign({ id: d.id }, d)), A.cfg, A.S);
  saveSnapshot(bkey);
  afterBuild(txn);
}
const STORE_VERSION = 6;
function saveSnapshot(key) {
  if (A.local || !A.S || !A.S.n) return;
  try {
    const S = {}; for (const k of Object.keys(A.S)) if (k[0] !== '_') S[k] = A.S[k];
    S.owState = ''; // the copy is taken before the one-off warranty setting is applied
    IDB.set('store-snapshot', { v: STORE_VERSION, key, S, T: A.T, at: Date.now() });
  } catch (e) { console.warn('Could not keep a local copy of the data store', e); }
}
function afterBuild(txn) {
  A.schedules = A.imports.filter(d => d.kind === 'schedule').flatMap(d => d.models || []);
  A.coverage = new Set(txn.map(d => C.ymFromStr(d.period)));
  const S = A.S;
  if (S.n) {
    const cut = C.ymOf(S.maxDay), min = C.ymOf(S.minDay);
    /* each time the app opens (or a newer month arrives) every tab starts on the latest month: From = To = last month */
    if (A._periodCut !== cut) { A._periodCut = cut; A.f.s = A.f.e = cut; for (const k in A.fBy) { A.fBy[k].s = A.fBy[k].e = cut; } }
    if (!A.f.e || A.f.e > cut || A.f.e < min) A.f.e = cut;
    if (!A.f.s || A.f.s > A.f.e || A.f.s < min) A.f.s = A.f.e;
    for (const k in A.fBy) fixRange(A.fBy[k]);
  }
  if (!A.chosen) A.chosen = new Set();
  render();
}

/* ======================= filters ======================= */
function branchNames() {
  if (!A.S) return [];
  let names = A.S.branches.slice();
  if (A.scopeBranches) names = names.filter(n => A.scopeBranches.has(n));
  return names.sort((a, b) => { const ia = BRANCH_ORDER.indexOf(a), ib = BRANCH_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
}
function permittedSet() { if (!A.scopeBranches) return null; return new Set(A.S.branches.map((n, i) => (A.scopeBranches.has(n) ? i : -1)).filter(i => i >= 0)); }
function curSet(forTrends) {
  const S = A.S, perm = permittedSet();
  if (A.f.branch !== 'all') { const i = S.branches.indexOf(A.f.branch); return new Set(i >= 0 ? [i] : []); }
  if (forTrends && A.chosen && A.chosen.size) { const s = new Set([...A.chosen].map(n => S.branches.indexOf(n)).filter(i => i >= 0 && (!perm || perm.has(i)))); return s; }
  return perm;
}
const actVal = () => ({ all: 'all', EM: 0, BS: 1, PDI: 2, 'EM+PDI': 'nobs', 'EM+BS': 'nopdi' })[A.f.act] ?? 'all';
const payVal = () => (A.f.pay === 'cash' ? 0 : A.f.pay === 'warranty' ? 1 : null);
const PAY_NAMES = { all: 'Cash + warranty', cash: 'Cash', warranty: 'Warranty' };
function F(extra) { return Object.assign({ s: A.f.s, e: A.f.e, branches: curSet(false), act: actVal(), noOW: !!(A.f.noOW && owDefined()), cw: payVal() }, extra || {}); }
/* one period / branch / activity / payer for every tab (switchFilters carries it over); only "Group by" is kept per tab */
function fixRange(f) {
  const S = A.S; if (!S || !S.n) return f;
  const cut = C.ymOf(S.maxDay), min = C.ymOf(S.minDay);
  if (!f.e || f.e > cut || f.e < min) f.e = cut;
  if (!f.s || f.s > f.e || f.s < min) f.s = f.e;
  if (!f.pay) f.pay = 'all';
  return f;
}
function filterFor(pid) { const f = A.f; return Object.assign({}, A.fBy[pid] || f, { s: f.s, e: f.e, branch: f.branch, act: f.act, pay: f.pay, noOW: f.noOW }); }
function switchFilters(pid) {
  if (A.fPid === pid) return;
  if (A.fPid) A.fBy[A.fPid] = A.f;
  // one selection for the whole studio: period, branch, activity and payer follow you to every tab (only "Group by" stays per tab)
  const prev = A.f, own = A.fBy[pid];
  A.f = Object.assign({}, own || prev, prev ? { s: prev.s, e: prev.e, branch: prev.branch, act: prev.act, pay: prev.pay, noOW: prev.noOW } : {});
  A.fBy[pid] = A.f; A.fPid = pid;
  fixRange(A.f);
  try { localStorage.setItem('ps.fBy', JSON.stringify(A.fBy)); } catch (e) {}
}
function withFilter(f, fn) { const keep = A.f; A.f = f; try { return fn(); } finally { A.f = keep; } }
function scopeText(f) { f = f || A.f; return `${f.branch === 'all' ? (A.scopeBranches ? 'Assigned branches' : 'All branches') : f.branch} · ${f.act === 'all' ? 'EM + BS + PDI' : f.act.replace('+', ' + ')}${f.pay && f.pay !== 'all' ? ' · ' + PAY_NAMES[f.pay] + ' only' : ''}`; }
function monthOptions() {
  const S = A.S; if (!S || !S.n) return [];
  const out = []; for (let m = C.ymOf(S.minDay); m <= C.ymOf(S.maxDay); m = C.ymAdd(m, 1)) out.push(m); return out;
}
function workingDays(s, e) {
  let wd = 0, cd = 0; const missing = []; const cut = A.S && A.S.n ? A.S.maxDay : 0, cutYm = C.ymOf(cut); let partial = false;
  for (let m = s; m <= e; m = C.ymAdd(m, 1)) {
    const t = A.T && A.T.byMonth.get(m);
    if (!t || !t.wd) missing.push(m); else wd += (m === cutYm && t.elapsed && t.elapsed < t.wd && cut % 100 < C.daysInMonth(m)) ? t.elapsed : t.wd;
    if (m < cutYm) cd += C.daysInMonth(m); else if (m === cutYm) { cd += cut % 100; if (cut % 100 < C.daysInMonth(m)) partial = true; }
  }
  return { wd: missing.length ? NaN : wd, wdPartialSum: wd, cd, missing, partial };
}
function coverageOf(s, e) { const exp = [], miss = []; for (let m = s; m <= e; m = C.ymAdd(m, 1)) { exp.push(m); if (!A.coverage.has(m)) miss.push(m); } return { expected: exp.length, missing: miss }; }
function stats(s, e, opts) {
  const f = F(Object.assign({ s, e }, opts || {}));
  const idx = C.select(A.S, f), sm = C.summarize(A.S, idx), ach = C.achievement(A.S, A.T, f), d = workingDays(s, e), cov = coverageOf(s, e);
  return { f, idx, sm, ach, days: d, cov, revWd: sm.rev / d.wd, revCd: d.cd ? sm.rev / d.cd : NaN };
}

/* ======================= charts ======================= */
function niceTicks(mn, mx, count) {
  const span = mx - mn || 1, raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step, out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return out;
}
const axisFmt = (v, fmt) => (fmt === 'pct' ? (v * 100).toFixed(1) + '%' : fmt === 'int' ? compact(v) : compact(v));
const valFmt = (v, fmt) => (fmt === 'pct' ? pct(v) : fmt === 'int' ? fmtInt(v) : egp(v));
function lineChart(o) {
  const W = 760, H = 300, L = 64, R = 26, T = 40, B = 48, PW = W - L - R, PH = H - T - B;
  const n = o.labels.length;
  pushBlock({ type: 'line', labels: o.labels.map(String), multi: o.series.map(se => ({ name: txt(se.name), values: se.values.map(v => (Number.isFinite(v) ? v : null)) })), fmt: o.fmt });
  const all = o.series.flatMap(s => s.values).filter(Number.isFinite);
  if (!n || !all.length) return `<div class="empty"><strong>No values to chart</strong>${esc(o.emptyText || 'Nothing matches these filters yet.')}</div>`;
  let mn = Math.min(0, ...all), mx = Math.max(0, ...all); if (mx === mn) mx = mn + (o.fmt === 'pct' ? 0.01 : 1);
  const ticks = niceTicks(mn, mx, 4); mn = ticks[0]; mx = ticks[ticks.length - 1];
  const x = i => L + (n === 1 ? PW / 2 : (i * PW) / (n - 1)), y = v => T + ((mx - v) / (mx - mn)) * PH;
  const step = n > 1 ? PW / (n - 1) : PW;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || 'Line chart')}">`;
  (o.missing || []).forEach((m, i) => { if (m) s += `<rect x="${x(i) - step / 2}" y="${T}" width="${step}" height="${PH}" fill="var(--line-2)" opacity=".8"><title>${esc(o.labels[i])}: no source file loaded</title></rect>`; });
  for (const v of ticks) { const yy = y(v); s += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" stroke="var(--line-2)"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" font-size="10.5">${axisFmt(v, o.fmt)}</text>`; }
  if (mn < 0) s += `<line x1="${L}" y1="${y(0)}" x2="${W - R}" y2="${y(0)}" stroke="var(--grey)" stroke-width="1.2"/>`;
  const every = Math.ceil(n / 12);
  o.labels.forEach((lb, i) => { if (i !== n - 1 && (i % every || (every > 1 && n - 1 - i < every))) return; s += `<text x="${x(i)}" y="${H - 22}" text-anchor="middle" font-size="10.5">${esc(lb)}</text>`; });
  o.series.forEach(se => {
    let d = '', pen = false;
    se.values.forEach((v, i) => { if (Number.isFinite(v)) { d += (pen ? ' L' : ' M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); pen = true; } else pen = false; });
    s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    se.values.forEach((v, i) => { if (!Number.isFinite(v)) return; const partial = se.status && se.status[i] === 'partial'; s += `<circle cx="${x(i)}" cy="${y(v)}" r="${n > 40 ? 2.2 : 3.6}" fill="${partial ? 'var(--sheet)' : se.color}" stroke="${se.color}" stroke-width="${partial ? 2 : 0}"><title>${esc(se.name)} · ${esc(o.labels[i])}: ${valFmt(v, o.fmt)}${partial ? ' (partial period)' : ''}</title></circle>`; });
  });
  { // value label on every point
    const fs = n <= 14 ? 10.5 : n <= 31 ? 9 : 7.5, rot = n <= 14 ? 0 : n <= 31 ? -45 : -90, multi = o.series.length > 1;
    const lab = v => (o.fmt === 'pct' ? (v * 100).toFixed(1) + '%' : o.fmt === 'int' ? fmtInt(v) : compact(v));
    o.series.forEach((se, si) => se.values.forEach((v, i) => {
      if (!Number.isFinite(v)) return;
      const below = multi && si % 2 === 1 && !rot, px = x(i), py = y(v) + (below ? 15 : -8);
      s += rot ? `<text x="${px}" y="${y(v) - 7}" transform="rotate(${rot} ${px} ${y(v) - 7})" font-size="${fs}" fill="${se.color}" font-weight="600">${lab(v)}</text>` : `<text x="${px}" y="${py}" text-anchor="middle" font-size="${fs}" fill="${se.color}" font-weight="600" paint-order="stroke" stroke="var(--sheet)" stroke-width="3">${lab(v)}</text>`;
    }));
  }
  s += '</svg>';
  const leg = o.series.map(se => `<span><i class="sw" style="background:${se.color}"></i>${esc(se.name)}</span>`).join('');
  const extra = (o.missing || []).some(Boolean) ? '<span><i class="sw sq" style="background:var(--line-2)"></i>No source file</span>' : '';
  const part = o.series.some(se => (se.status || []).includes('partial')) ? '<span><i class="sw" style="border:2px solid var(--grey);background:var(--sheet)"></i>Partial period</span>' : '';
  return `<div class="scroll">${s}</div><div class="legend">${leg}${extra}${part}</div>`;
}
function hbars(rows, o) {
  o = o || {};
  { const names = rows[0] && rows[0].segs.length > 1 ? rows[0].segs.map(sg => sg.name || '') : null; pushBlock({ type: 'bars', labels: rows.map(r => txt(r.label)), values: rows.map(r => r.segs.reduce((t, sg) => t + (Number.isFinite(sg.v) ? sg.v : 0), 0)), stack: names ? names.map((nm, k) => ({ name: nm, values: rows.map(r => (r.segs[k] && Number.isFinite(r.segs[k].v) ? r.segs[k].v : 0)) })) : null, marker: rows.some(r => r.marker) ? rows.map(r => r.marker || 0) : null, notes: rows.map(r => [txt(r.label), txt(r.value), txt(r.sub || '')]), fmt: o.fmt || (o.max === 1 ? 'pct' : 'money') }); }
  if (!rows.length) return `<div class="empty"><strong>Nothing to show</strong>${esc(o.emptyText || 'No records for these filters.')}</div>`;
  const max = o.max || Math.max(...rows.map(r => r.segs.reduce((t, sg) => t + Math.max(0, sg.v), 0)), ...rows.map(r => (r.marker || 0)), 1e-9);
  if (o.wide == null) o = Object.assign({}, o, { wide: rows.some(r => txt(r.label).length > 20) }); // names longer than the narrow column: show them in full
  const items = rows.map(r => {
    const multiSeg = r.segs.length > 1;
    const segs = r.segs.map(sg => { const w = (Math.max(0, sg.v) / max) * 100; return `<i class="seg" style="width:${w}%;background:${sg.color}" title="${esc(sg.name ? sg.name + ': ' : '')}${esc(sg.label || '')}">${multiSeg && w >= 9 ? `<span>${o.max === 1 ? pct(sg.v) : compact(sg.v)}</span>` : ''}</i>`; }).join('');
    const brk = multiSeg && !o.noBrk ? `<div class="mini segbrk">${r.segs.map(sg => `<span><i class="sw sq" style="background:${sg.color}"></i>${esc(sg.name || '')} ${o.max === 1 ? pct(sg.v) : compact(sg.v)}</span>`).join('')}</div>` : '';
    const mk = r.marker ? `<b style="left:${Math.min(100, (r.marker / max) * 100)}%" title="Target"></b>` : '';
    return `<div class="hrow" style="display:grid;grid-template-columns:${o.wide ? 'minmax(160px,42%) minmax(80px,1fr) auto' : 'minmax(90px,170px) minmax(0,1fr) auto'};gap:10px;align-items:center;padding:5px 0"><div style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;${o.wide ? 'line-height:1.3' : 'white-space:nowrap'}" title="${esc(r.label)}">${esc(r.label)}</div><div class="bar" style="height:16px;display:flex">${segs}${mk}</div><div style="font-size:12.5px;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap">${r.value}${brk}${r.sub ? `<div class="mini">${r.sub}</div>` : ''}</div></div>`;
  }).join('');
  const leg = o.legend ? `<div class="legend">${o.legend.map(l => `<span><i class="sw sq" style="background:${l[1]}"></i>${esc(l[0])}</span>`).join('')}${rows.some(r => r.marker) ? '<span><i class="sw sq" style="background:var(--fg);width:3px"></i>Target</span>' : ''}</div>` : '';
  return `<div role="list" class="hlist" aria-label="${esc(o.aria || 'Bar chart')}">${items}</div>${leg}`;
}
function table(head, rows, opts) {
  opts = opts || {};
  // plain-text copy for the PowerPoint/PDF, made only when an export asks for it
  let exRows = null;
  const blk = { type: 'table', head: head.map(txt), get rows() { if (!exRows) exRows = rows.map(r => { const a = (r.cells || r).map(txt); if (r._cls === 'total') a._total = true; return a; }); return exRows; } };
  if (opts.fullFn) { let fr = null; Object.defineProperty(blk, 'full', { get() { if (!fr) fr = opts.fullFn(); return fr; } }); Object.defineProperty(blk, 'fullHead', { get() { return opts.fullHead(); } }); }
  if (opts.xlGroups) { Object.defineProperty(blk, 'groups', { get() { return typeof opts.xlGroups === 'function' ? opts.xlGroups() : opts.xlGroups; } }); blk.bands = opts.xlBands || null; }
  pushBlock(blk);
  const al = opts.align || head.map((_, i) => (i ? 'num' : ''));
  const th = head.map((h, i) => `<th class="${al[i]}">${h}</th>`).join('');
  const tr = rows.map(r => { const cls = r._cls ? ` class="${r._cls}"` : ''; const cells = (r.cells || r); return `<tr${cls}>${cells.map((c, i) => `<td class="${al[i]}">${c}</td>`).join('')}</tr>`; }).join('');
  return `<div class="scroll"${opts.maxH ? ` style="max-height:${opts.maxH}px"` : ''}><table class="table"><thead><tr>${th}</tr></thead><tbody>${tr || `<tr><td colspan="${head.length}" class="mini">No rows.</td></tr>`}</tbody></table></div>`;
}
const statusTag = ach => { const st = C.targetStatus(ach); return `<span class="tag ${st === 'on' ? 'on' : st === 'near' ? 'near' : st === 'below' ? 'below' : ''}">${st === 'on' ? 'On target' : st === 'near' ? 'Within 10%' : st === 'below' ? 'Below' : 'No target'}</span>`; };
const achBar = ach => { if (!Number.isFinite(ach)) return '<span class="mini">N/A</span>'; const st = C.targetStatus(ach); return `<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span class="ach ${st}">${achPct(ach)}</span><div class="bar" style="width:90px"><i class="${st}" style="width:${Math.min(100, ach * 100 / 1.5)}%"></i><b style="left:${100 / 1.5}%"></b></div></div>`; };
const deltaChip = (d, invert) => { if (!Number.isFinite(d)) return '<span class="delta flat">n/a</span>'; const up = d > 0.0005, dn = d < -0.0005; const good = invert ? dn : up, bad = invert ? up : dn; return `<span class="delta ${good ? 'up' : bad ? 'down' : 'flat'}">${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%</span>`; };
const ppChip = (d, invert) => { if (!Number.isFinite(d)) return '<span class="delta flat">n/a</span>'; const v = d * 100, up = v > 0.05, dn = v < -0.05; const good = invert ? dn : up, bad = invert ? up : dn; return `<span class="delta ${good ? 'up' : bad ? 'down' : 'flat'}">${v > 0 ? '+' : ''}${v.toFixed(1)} pp</span>`; };
function cards(items, title) { const keep = NUM.pending, keepS = NUM.subs; const kx = items.map(x => ({ label: x.label, value: txt(x.value), note: txt(x.note || '') })); NUM.pending = [{ type: 'kpis', items: kx }]; NUM.subs = kx.map(k => ({ title: txt(k.label), desc: '', blocks: [{ type: 'kpis', items: [k] }], subs: [], kpiSub: true })); const it = takeItem(title || 'Key figures', ''); NUM.pending = keep; NUM.subs = keepS; return `<div class="kpiwrap"${it ? ` id="n-${it.id}"` : ''}>${it ? `<div class="kpi-num">${pickBox(it.id)}${numBadge(it.id)}<span>${esc(title || 'Key figures')}</span></div>` : ''}${foldWrap(foldLabel(it), `<div class="kpis">${items.map((x, k) => `<div class="kpi ${x.t || ''}"><div class="label">${it ? `${pickBox(`${it.id}.${k + 1}`)}<span class="numb kn">${it.id}.${k + 1}</span>` : ''}${esc(x.label)}</div><div class="value ${x.count ? 'count' : ''}">${x.value}</div><div class="note">${x.note || ''}</div></div>`).join('')}</div>`, it)}</div>`; }
const sec = (title, desc, body, right) => secNum(title, desc, body, right);

/* ======================= page: overview ======================= */
function emptyData() {
  const admin = isAdmin();
  if (admin) return `<div class="notice"><b>No transaction data saved yet.</b> Upload the DSR achieved folder and the Target folder below (or from Data &amp; imports). Files are saved once and stay available on every device.</div>` + uploadSection() + (A.staging.length ? stagingSection() : '');
  if (!admin && A.cloud !== 'off') return `<div class="section empty"><strong>No transaction data saved yet</strong>You are signed in as <b>${esc((A.me && A.me.name) || 'a viewer')}</b> with view-only access, so the upload area is hidden. Data can be uploaded by an administrator account, or directly on the studio computer at <b>http://localhost:8080</b>.</div>`;
  return `<div class="section empty"><strong>No transaction data saved yet</strong>${admin ? 'Open <b>Data &amp; imports</b> and upload the DSR achieved (transactions) folder and the Target folder. Files are kept in this artifact\'s cloud storage, so they are available on your phone and laptop.' : 'The administrator has not uploaded data yet. Check back once the transaction and target folders are imported.'}<div style="margin-top:14px">${admin ? '<button class="btn yellow" data-act="goto" data-page="data">Go to Data &amp; imports</button>' : ''}</div></div>`;
}
/* 2.2 key figures against the same period last year and the whole of last year (each comparison cell shows the change of the selected period, coloured) */
function extKeyFigures() {
  const S = A.S, P = S.P;
  const q = (a, b) => (b ? a / b : NaN);
  const per = (s, e) => {
    const st = stats(s, e), sm = st.sm, ix = Array.from(st.idx);
    const act = [0, 1].map(a => C.summarize(S, ix.filter(i => S.act[i] === a))), eb = C.summarize(S, ix.filter(i => S.act[i] !== 2));
    const pay = [0, 1].map(w => C.summarize(S, ix.filter(i => S.cw[i] === w)));
    const pp = [[], []], pw = [[], []];
    if (P && P.n) for (const i of C.selectParts(S, Object.assign(F({ s, e }), { exCats: [] }))) { if (P.act[i] < 2) pp[P.act[i]].push(i); if (P.cw[i] < 2) pw[P.cw[i]].push(i); }
    const pa = pp.map(l => C.sumParts(S, l)), pc = pw.map(l => C.sumParts(S, l)), o = P && P.n ? oilCalc(F({ s, e })).tot : { l: 0, kg: 0, net: 0 };
    const rosEB = act[0].ros + act[1].ros, partsEB = pa[0].net + pa[1].net, labEB = act[0].labour + act[1].labour;
    return { has: sm.lines > 0, rev: sm.rev, target: st.ach.target, ach: st.ach.target > 0 ? sm.rev / st.ach.target : NaN, entries: sm.entries, vins: sm.vins, pdi: sm.pdiVins,
      ros: sm.ros, rosEM: act[0].ros, rosBS: act[1].ros, disc: sm.disc, discEM: act[0].disc, discBS: act[1].disc, discRos: sm.discRos, discRosEM: act[0].discRos, discRosBS: act[1].discRos, discR: sm.rate, discREM: act[0].rate, discRBS: act[1].rate,
      perRos: sm.perRos, wd: st.days.wd, oilL: o.l, oilKg: o.kg, oilRev: o.net, oilP: q(o.net, o.l),
      parts: pc[0].net + pc[1].net, partsC: pc[0].net, partsW: pc[1].net,
      pRo: q(partsEB, rosEB), pRoEM: q(pa[0].net, act[0].ros), pRoBS: q(pa[1].net, act[1].ros), pVin: q(partsEB, eb.vins), pVinEM: q(pa[0].net, act[0].vins), pVinBS: q(pa[1].net, act[1].vins),
      lab: pay[0].labour + pay[1].labour, labC: pay[0].labour, labW: pay[1].labour,
      lRo: q(labEB, rosEB), lRoEM: q(act[0].labour, act[0].ros), lRoBS: q(act[1].labour, act[1].ros), lVin: q(labEB, eb.vins), lVinEM: q(act[0].labour, act[0].vins), lVinBS: q(act[1].labour, act[1].vins),
      lHr: q(pay[0].labour + pay[1].labour, pay[0].hours + pay[1].hours), lHrC: q(pay[0].labour, pay[0].hours), lHrW: q(pay[1].labour, pay[1].hours),
      lp: q(labEB, act[0].parts + act[1].parts), lpEM: q(act[0].labour, act[0].parts), lpBS: q(act[1].labour, act[1].parts),
      wc: q(act[0].payer[1] + act[1].payer[1], act[0].payer[0] + act[1].payer[0]), wcEM: q(act[0].payer[1], act[0].payer[0]), wcBS: q(act[1].payer[1], act[1].payer[0]) };
  };
  const fyY = Math.floor(A.f.e / 100) - 1, cur = per(A.f.s, A.f.e), ly = per(A.f.s - 100, A.f.e - 100), fy = per(fyY * 100 + 1, fyY * 100 + 12);
  const E = v => (Number.isFinite(v) ? egp(v) : 'N/A'), N = v => (Number.isFinite(v) ? fmtInt(v) : 'N/A'), Pc = v => (Number.isFinite(v) ? pct(v) : 'N/A');
  const Lt = v => (Number.isFinite(v) ? fmtInt(v) + ' L' : 'N/A'), Kg = v => (Number.isFinite(v) ? `${fmtInt(v)} kg (${(v / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t)` : 'N/A');
  // a total with its EM and BS parts in the same cell: 57,875 [EM 50,218 + BS 3,497]
  const split = (fmt, k, sub) => (o => `${fmt(o[k])}<div class="mini">[EM ${(sub || fmt)(o[k + 'EM'])} + BS ${(sub || fmt)(o[k + 'BS'])}]</div>`);
  // [label, key, format, change: 'pct' | 'inv' (a rise is worse) | 'pp' (points), sub-line, cell renderer]
  const G = t => ['§' + t];
  const rows = [['Revenue', 'rev', E, 'pct'], ['Target', 'target', E, 'pct'], ['Target achievement', 'ach', Pc, 'pp'], ['Car entries', 'entries', N, 'pct'], ['Unique vehicles', 'vins', N, 'pct'], ['PDI vehicles', 'pdi', N, 'pct'],
    ['Repair orders [EM + BS]', 'ros', N, 'pct'], ['EM', 'rosEM', N, 'pct', 1], ['BS', 'rosBS', N, 'pct', 1],
    ['Discount value [EM + BS]', 'disc', E, 'inv'], ['EM', 'discEM', E, 'inv', 1], ['BS', 'discBS', E, 'inv', 1],
    ['Discounted ROs [EM + BS]', 'discRos', N, 'inv'], ['EM', 'discRosEM', N, 'inv', 1], ['BS', 'discRosBS', N, 'inv', 1],
    ['Discount rate [EM + BS]', 'discR', Pc, 'ppi'], ['EM', 'discREM', Pc, 'ppi', 1], ['BS', 'discRBS', Pc, 'ppi', 1],
    ['Periodic-maintenance ROs', 'perRos', N, 'pct'], ['Working days', 'wd', N, 'pct'],
    G('Oil'), ['Oil consumed', 'oilL', Lt, 'pct'], ['Oil weight', 'oilKg', Kg, 'pct'], ['Oil revenue', 'oilRev', E, 'pct'], ['Oil price for 1 litre (EGP)', 'oilP', E, 'pct'],
    G('Parts'), ['Parts revenue [cash + warranty] (EGP)', 'parts', E, 'pct'], ['Cash', 'partsC', E, 'pct', 1], ['Warranty', 'partsW', E, 'pct', 1],
    ['Parts per RO [EM + BS]', 'pRo', E, 'pct'], ['EM', 'pRoEM', E, 'pct', 1], ['BS', 'pRoBS', E, 'pct', 1], ['Parts per VTP [EM + BS] (EGP)', 'pVin', E, 'pct'], ['EM', 'pVinEM', E, 'pct', 1], ['BS', 'pVinBS', E, 'pct', 1],
    G('Labour'), ['Labour revenue [cash + warranty] (EGP)', 'lab', E, 'pct'], ['Cash', 'labC', E, 'pct', 1], ['Warranty', 'labW', E, 'pct', 1],
    ['Labour per RO [EM + BS]', 'lRo', E, 'pct'], ['EM', 'lRoEM', E, 'pct', 1], ['BS', 'lRoBS', E, 'pct', 1], ['Labour per VTP [EM + BS]', 'lVin', E, 'pct'], ['EM', 'lVinEM', E, 'pct', 1], ['BS', 'lVinBS', E, 'pct', 1],
    ['Labour / hours (cash + warranty)', 'lHr', E, 'pct'], ['Cash', 'lHrC', E, 'pct', 1], ['Warranty', 'lHrW', E, 'pct', 1],
    G('Ratios'), ['Labour / parts ratio [EM + BS]', 'lp', Pc, 'pp'], ['EM', 'lpEM', Pc, 'pp', 1], ['BS', 'lpBS', Pc, 'pp', 1], ['Warranty / cash ratio [EM + BS]', 'wc', Pc, 'ppi'], ['EM', 'wcEM', Pc, 'ppi', 1], ['BS', 'wcBS', Pc, 'ppi', 1]];
  const show = (o, r) => (r[5] ? r[5](o) : r[2](o[r[1]]));
  const cell = (o, r) => { if (!o.has) return '<span class="mini">not loaded</span>'; const v = o[r[1]], c = cur[r[1]]; const ch = r[3] === 'pp' ? ppChip(c - v) : r[3] === 'ppi' ? ppChip(c - v, true) : deltaChip(chg(c, v), r[3] === 'inv'); return `${show(o, r)} ${ch}`; };
  // the Excel: each value in its own cell, with the change in the next column (green better, red worse)
  const lyT = periodText({ s: A.f.s - 100, e: A.f.e - 100 }), xHead = ['Key figure', `${periodText(A.f)} (selected)`, `${lyT} (same period last year)`, `Change vs ${lyT}`, `Jan–Dec ${fyY} (last year)`, `Change vs Jan–Dec ${fyY}`];
  const xv = (o, r) => { if (!o.has) return 'not loaded'; const v = o[r[1]]; if (!Number.isFinite(v)) return 'N/A'; return r[2] === Pc ? { pct: v } : Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100; };
  const xc = (o, r) => { if (!o.has) return ''; const v = o[r[1]], c = cur[r[1]]; if (!Number.isFinite(v) || !Number.isFinite(c)) return ''; if (r[3] === 'pp' || r[3] === 'ppi') { const d = c - v; return { pp: d, good: r[3] === 'ppi' ? d < 0 : d > 0 }; } const d = chg(c, v); return Number.isFinite(d) ? { pct: d, signed: true, good: r[3] === 'inv' ? d < 0 : d > 0 } : ''; };
  // every main figure is bold across the whole row (selected period, same period last year, last year); EM / BS and cash / warranty lines stay regular
  const xRows = () => rows.map((r, k) => { if (r.length === 1) { const a = [r[0].slice(1).toUpperCase(), '', '', '', '', '']; a._grp = true; return a; } const a = [r[4] ? '    ' + r[0] : r[0], xv(cur, r), xv(ly, r), xc(ly, r), xv(fy, r), xc(fy, r)]; if (!r[4]) a._bold = true; return a; });
  const out = rows.map(r => (r.length === 1 ? { _cls: 'grp', cells: [`<b>${r[0].slice(1).toUpperCase()}</b>`, '', '', ''] } : [r[4] ? `<span style="display:inline-block;min-width:230px;padding-left:18px;color:var(--muted)">${r[0]}</span>` : `<b style="display:inline-block;min-width:230px">${r[0]}</b>`, r[4] ? show(cur, r) : `<b>${show(cur, r)}</b>`, cell(ly, r), cell(fy, r)]));
  return sec('Key figures — against last year', `The selected period (${periodText(A.f)}), the same period last year (${periodText({ s: A.f.s - 100, e: A.f.e - 100 })}) and the whole of last year (Jan–Dec ${fyY}). Each last-year cell shows its value and the change of the selected period against it: green is better, red is worse (for discounts, the discount rate and the warranty / cash ratio a rise is red; discount rate = discount ÷ (revenue + discount); achievement and ratios show percentage points). Repair orders and discounted ROs in the total include PDI, so EM + BS is less than the total. Labour / hours = labour revenue ÷ billed labour hours. Oil uses the oil list in Parts.`, table(['Key figure', `${periodText(A.f)} (selected)`, `${periodText({ s: A.f.s - 100, e: A.f.e - 100 })} (same period last year)`, `Jan–Dec ${fyY} (last year, 12 months)`], out, { align: ['', 'num', 'num', 'num'], fullHead: () => xHead, fullFn: () => xRows(), xlGroups: ['id', 'cur', 'ly', 'ly', 'fy', 'fy'], xlBands: { id: '', cur: 'Selected period', ly: 'Same period last year', fy: `Last year (Jan–Dec ${fyY})` } }));
}
function pageOverview() {
  const S = A.S, cur = stats(A.f.s, A.f.e);
  const sm = cur.sm, prevY = stats(A.f.s - 100, A.f.e - 100), py = prevY.sm;
  const hasPY = py.lines > 0;
  const cmpNote = (a, b, invert) => (hasPY ? `${deltaChip(chg(a, b), invert)}vs same months ${Math.floor(A.f.s / 100) - 1}` : 'No prior-year data loaded');
  const ach = cur.ach;
  let h = cards([
    { label: 'Total revenue', value: egpC(sm.rev), note: `${cmpNote(sm.rev, py.rev)}<br>Signed net invoiced, refunds kept`, t: '' },
    /* no target for the months chosen: say which month's Target file is missing instead of showing EGP 0 */
    ...(() => { const noT = !(Number.isFinite(ach.target) && ach.target > 0); A._noTgtMsg = noT && ach.missingMonths.length ? `No Target file loaded for ${ach.missingMonths.map(ymLbl).join(', ')}. Import it in Data &amp; imports.` : ''; return []; })(),
    { label: 'Target achievement', value: achText(ach.ach), note: Number.isFinite(ach.ach) ? `${statusTag(ach.ach)} ${egpC(ach.revenue)} of ${egpC(ach.target)}${ach.missingMonths.length ? `<br>${ach.missingMonths.length} month(s) without target excluded` : ''}` : (A._noTgtMsg || ach.note || 'No target file for this period'), t: 't-blue' },
    { label: 'Target', value: Number.isFinite(ach.target) && ach.target > 0 ? egpC(ach.target) : 'N/A', note: Number.isFinite(ach.target) && ach.target > 0 ? `${hasPY && Number.isFinite(prevY.ach.target) && prevY.ach.target > 0 ? cmpNote(ach.target, prevY.ach.target) + '<br>' : ''}Budget from the target reports${ach.missingMonths.length ? ` · ${ach.missingMonths.length} month(s) without target` : ''}` : (A.f.act === 'PDI' ? 'PDI has no target' : A._noTgtMsg || 'No target loaded for this period'), t: 't-blue' },
    { label: 'Gap to target', value: Number.isFinite(ach.target) && ach.target > 0 ? `<span class="ach ${ach.revenue - ach.target >= 0 ? 'on' : 'below'}">${ach.revenue - ach.target >= 0 ? '+' : '−'}${egpC(Math.abs(ach.revenue - ach.target))}</span>` : 'N/A', note: Number.isFinite(ach.target) && ach.target > 0 ? `${ach.revenue - ach.target >= 0 ? 'Above' : 'Below'} target · revenue counted against target ${egpC(ach.revenue)}` : (A._noTgtMsg ? 'Needs the Target file for the period' : ''), t: 't-dark' },
    { label: 'Car entries', value: fmtInt(sm.entries), count: true, note: `${cmpNote(sm.entries, py.entries)}<br>Distinct ROs, PDI excluded`, t: 't-mag' },
    { label: 'Unique vehicles', value: fmtInt(sm.vins), count: true, note: `${cmpNote(sm.vins, py.vins)}<br>Distinct valid VINs`, t: 't-dark' },
    { label: 'Revenue per RO', value: egpC(sm.revPerRo), note: `${cmpNote(sm.revPerRo, py.revPerRo)}<br>${fmtInt(sm.ros)} repair orders (branch + RO)` },
    { label: 'Revenue per vehicle', value: egpC(sm.revPerVin), note: cmpNote(sm.revPerVin, py.revPerVin), t: 't-blue' },
    { label: 'Discount value', value: egpC(sm.disc), note: `${cmpNote(sm.disc, py.disc, true)}<br>Sum of source discount values`, t: 't-mag' },
    { label: 'Discount rate', value: pct(sm.rate), note: `${hasPY ? ppChip(sm.rate - py.rate, true) + 'vs prior year' : ''}<br>Discount ÷ (revenue + discount)`, t: 't-amber' },
    { label: 'Discounted ROs', value: fmtInt(sm.discRos), count: true, note: `${pct(sm.ros ? sm.discRos / sm.ros : NaN)} of repair orders` },
    { label: 'Periodic-maintenance ROs', value: fmtInt(sm.perRos), count: true, note: `${cmpNote(sm.perRos, py.perRos)}<br>Recognised by job description rules`, t: 't-blue' },
    { label: 'PDI vehicles', value: fmtInt(sm.pdiVins), count: true, note: 'Proxy for sales, not confirmed retail deliveries', t: 't-mag' },
    { label: 'Revenue per working day', value: egpC(cur.revWd), note: cur.days.missing.length ? `Working days missing for ${cur.days.missing.map(ymLbl).join(', ')}` : `${cur.days.wd} working days from target reports`, t: 't-dark' },
  ]);
  { const al = buildAlerts(); if (al.length) h += `<div class="notice ${al.some(a => a.level === 'warn') ? 'err' : ''}"><b>${al.length} alert${al.length > 1 ? 's' : ''}.</b> ${al.slice(0, 3).map(a => a.text).join(' ')} <button class="btn small secondary" data-act="goto" data-page="alerts">See all</button></div>`; }
  { const comps = ['L', 'P', 'O'].map(c => C.achievement(A.S, A.T, cur.f, c)); h += sec('Labour, parts and other against budget', 'The DSR split: each component against its own budget from the target reports.', hbars(comps.map((a, k) => ({ label: ['Labour', 'Parts', 'Other'][k], segs: [{ v: a.revenue, color: Number.isFinite(a.ach) ? statusColor(a.ach) : 'var(--blue)' }], marker: a.target, value: `<b>${egpC(a.revenue)}</b>`, sub: achLine(a.revenue, a.target) + `<br><span class="mini">${pct(sm.rev ? [sm.labour, sm.parts, sm.other][k] / sm.rev : NaN)} of revenue</span>` })), { aria: 'Labour parts other' })); }
  h += `<div class="choices"><button class="btn small secondary" data-act="goto" data-page="vtp">Go to Customer shows — VTP analysis →</button></div>`;
  h += comparisonSection();
  // payer + activity
  const pay = [['Customer-pay', sm.payer[0], 'var(--c1)'], ['Warranty', sm.payer[1], 'var(--c2)'], ['PDI', sm.payer[2], 'var(--c3)']];
  const actIdxRos = sm.actRos;
  h += `<div class="two">${sec('Revenue by payer', 'Customer-pay includes insurance and fleet accounts billed as cash; warranty and PDI come from the C/W column.', hbars(pay.map(p => ({ label: p[0], segs: [{ v: p[1], color: p[2] }], value: egp(p[1]), sub: pct(sm.rev ? p[1] / sm.rev : NaN) + ' of revenue' })), { aria: 'Revenue by payer' }))}
  ${sec('EM, BS and PDI performance', 'Mechanical workshop, body shop and pre-delivery inspection, each with its distinct repair orders.', hbars(['EM', 'BS', 'PDI'].map((a, i) => ({ label: a === 'EM' ? 'EM · mechanical' : a === 'BS' ? 'BS · body shop' : 'PDI · pre-delivery', segs: [{ v: sm.act[i], color: `var(--c${i + 1})` }], value: `${egp(sm.act[i])} <span class="mini">(${pct(sm.rev ? sm.act[i] / sm.rev : NaN)})</span>`, sub: `${fmtInt(actIdxRos[i])} ROs · ${egpC(actIdxRos[i] ? sm.act[i] / actIdxRos[i] : NaN)}/RO` })), { aria: 'Revenue by activity' }))}</div>`;
  h += billingTrendSection(cur.idx);
  h += scorecardSection(cur);
  h += dayComparisonSection();
  h += growthDrivers(cur, prevY);
  h += sec('Management insights', 'Generated from the figures on this page. They describe what changed, not why.', `<ul class="insights">${insights(cur, prevY).map(i => `<li class="${i.warn ? 'warn' : ''}">${i.text}</li>`).join('')}</ul>`);
  return h;
}
function comparisonSection() {
  const e = A.f.e, S = A.S;
  const qStart = Math.floor(e / 100) * 100 + (Math.ceil((e % 100) / 3) - 1) * 3 + 1;
  const qLen = e - qStart + 1;
  const pqStart = C.ymAdd(qStart, -3), pqEnd = C.ymAdd(pqStart, qLen - 1);
  const yStart = Math.floor(e / 100) * 100 + 1;
  const rowsDef = [
    { name: 'Month', a: [e, e], b: [C.ymAdd(e, -1), C.ymAdd(e, -1)], la: ymLbl(e), lb: ymLbl(C.ymAdd(e, -1)) },
    { name: qLen < 3 ? 'Quarter to date' : 'Quarter', a: [qStart, e], b: [pqStart, pqEnd], la: `Q${Math.ceil((e % 100) / 3)} ${Math.floor(e / 100)}${qLen < 3 ? ` (${qLen} mo)` : ''}`, lb: `Q${Math.ceil((pqStart % 100) / 3)} ${Math.floor(pqStart / 100)}${qLen < 3 ? ` (first ${qLen} mo)` : ''}` },
    { name: 'Year to date', a: [yStart, e], b: [yStart - 100, e - 100], la: `Jan–${MON[e % 100 - 1]} ${Math.floor(e / 100)}`, lb: `Jan–${MON[e % 100 - 1]} ${Math.floor(e / 100) - 1}` },
  ];
  const rows = rowsDef.map(r => {
    const A1 = stats(r.a[0], r.a[1]), B1 = stats(r.b[0], r.b[1]);
    const bAvail = B1.sm.lines > 0;
    const covB = B1.cov.missing.length ? `<div class="mini">${B1.cov.missing.length} of ${B1.cov.expected} months not loaded</div>` : '';
    const covA = A1.cov.missing.length ? `<div class="mini">${A1.cov.missing.length} of ${A1.cov.expected} months not loaded</div>` : (A1.days.partial ? '<div class="mini">Latest month partial</div>' : '');
    return [`<b>${r.name}</b><div class="mini">${r.la} vs ${r.lb}</div>`, egp(A1.sm.rev) + covA, bAvail ? egp(B1.sm.rev) + covB : '<span class="mini">No data</span>', bAvail ? deltaChip(chg(A1.sm.rev, B1.sm.rev)) : '—', egp(A1.revWd), bAvail ? egp(B1.revWd) : '—', bAvail ? deltaChip(chg(A1.revWd, B1.revWd)) : '—', fmtInt(A1.sm.entries), bAvail ? deltaChip(chg(A1.sm.entries, B1.sm.entries)) : '—', pct(A1.sm.rate), bAvail ? ppChip(A1.sm.rate - B1.sm.rate, true) : '—'];
  });
  return sec('Period comparisons', `Ending ${ymLbl(e)}. Year to date compares the same months of the prior year that are loaded; revenue per working day uses working days from the target reports.`, table(['Comparison', 'Revenue', 'Comparison revenue', 'Change', 'Rev / working day', 'Comparison', 'Change', 'Car entries', 'Change', 'Discount rate', 'Change'], rows));
}
function billingTrendSection(idx) {
  const S = A.S, g = A.trendGran;
  const acc = new Map();
  for (const i of idx) {
    let k;
    if (g === 'day') k = S.day[i];
    else if (g === 'week') { const d = C.intToDate(S.day[i]); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); k = C.dateToInt(d); }
    else k = S.ym[i];
    acc.set(k, (acc.get(k) || 0) + S.net[i]);
  }
  let keys = [...acc.keys()].sort((a, b) => a - b);
  if (g === 'month') { keys = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) keys.push(m); }
  const labels = keys.map(k => (g === 'month' ? ymLbl(k) : `${k % 100} ${MON[Math.floor(k / 100) % 100 - 1]}`));
  const values = keys.map(k => (acc.has(k) ? acc.get(k) : (g === 'month' && A.coverage.has(k) ? 0 : null)));
  const missing = g === 'month' ? keys.map(k => !A.coverage.has(k) && !acc.has(k)) : [];
  const status = keys.map(k => (g === 'month' && k === C.ymOf(S.maxDay) && S.maxDay % 100 < C.daysInMonth(k) ? 'partial' : (g === 'week' ? 'complete' : 'complete')));
  const toggle = `<div class="choices">${[['month', 'Monthly'], ['week', 'Weekly'], ['day', 'Daily']].map(x => `<button class="choice ${g === x[0] ? 'on' : ''}" data-act="gran" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`;
  return sec('Billing trend', `Revenue by billing date${g === 'week' ? ' (weeks start on Sunday)' : ''}. Late-posted lines sit in the month they were billed.`, lineChart({ labels, series: [{ name: 'Revenue (EGP)', color: 'var(--blue)', values, status }], missing, fmt: 'money', aria: 'Billing trend' }), toggle);
}
function scorecardSection(cur) {
  const S = A.S, ach = cur.ach;
  const f = cur.f, idx = cur.idx;
  const byU = C.groupBy(S, idx, i => S.unit[i]);
  const achMap = new Map(ach.rows.map(r => [r.ui, r]));
  const rows = [...byU].map(([ui, ix]) => { const sm = C.summarize(S, ix); const a = achMap.get(ui); return { name: S.units[ui], sm, a }; }).sort((x, y) => y.sm.rev - x.sm.rev);
  const body = table(['Unit', 'Revenue', 'Target', 'Achievement', 'Status', 'DSR reported actual', 'Diff. vs DSR', 'ROs', 'Vehicles', 'Discount rate'], rows.map(r => {
    const a = r.a; const tgt = a && a.target > 0 ? a.target : NaN; const achv = a && a.target > 0 ? a.rev / a.target : NaN;
    return [esc(r.name), egp(r.sm.rev), Number.isFinite(tgt) ? egp(tgt) : '<span class="mini">No target</span>', achBar(achv), statusTag(achv), a && a.dsr ? egp(a.dsr) : '—', a && a.dsr ? egp(a.rev - a.dsr) : '—', fmtInt(r.sm.ros), fmtInt(r.sm.vins), pct(r.sm.rate)];
  }).concat([{ _cls: 'total', cells: ['Total (units with target)', egp(ach.revenue), egp(ach.target), achBar(ach.ach), statusTag(ach.ach), egp(ach.dsr), egp(ach.revenue - ach.dsr), '', '', ''] }]));
  const notes = [];
  if (ach.noTargetUnits.length) notes.push(`No target for: ${ach.noTargetUnits.map(esc).join(', ')} (revenue shown, excluded from achievement).`);
  if (ach.missingMonths.length) notes.push(`No target file for ${ach.missingMonths.map(ymLbl).join(', ')}; those months are excluded from achievement.`);
  return sec('Unit scorecard (DSR)', `Sorted by revenue. Achievement = revenue ÷ target, rounded to one decimal before the status is set (99.96% shows as 100.0% and counts as on target). PDI revenue counts toward the EM unit, matching the target reports.`, (notes.length ? `<div class="notice">${notes.join('<br>')}</div>` : '') + body);
}
function dayComparisonSection() {
  const rows = [];
  for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) {
    const st = stats(m, m), py = stats(m - 100, m - 100), t = A.T.byMonth.get(m);
    const d = st.days, has = A.coverage.has(m) || st.sm.lines;
    rows.push({ _cls: has ? '' : 'missing', cells: [ymLbl(m) + (d.partial ? ' <span class="tag near">Partial</span>' : ''), has ? egp(st.sm.rev) : 'No data', t && t.wd ? `${d.partial && t.elapsed ? t.elapsed + ' of ' : ''}${t.wd}` : '<span class="tag below">Missing</span>', egp(st.revWd), String(d.cd), egp(st.revCd), py.sm.lines ? egp(py.revWd) : '—', py.sm.lines ? deltaChip(chg(st.revWd, py.revWd)) : '—', py.sm.lines ? egp(py.revCd) : '—', py.sm.lines ? deltaChip(chg(st.revCd, py.revCd)) : '—'] });
  }
  return sec('Working-day and calendar-day comparison', 'Like-for-like view per month, against the same month of the prior year. Working days come from the target reports; calendar days stop at the latest billing date in the current month.', table(['Month', 'Revenue', 'Working days', 'Rev / working day', 'Calendar days', 'Rev / calendar day', 'Prior year / WD', 'Change', 'Prior year / CD', 'Change'], rows));
}
function insights(cur, prevY) {
  const out = [], sm = cur.sm, py = prevY.sm, ach = cur.ach;
  out.push({ text: `Revenue for ${A.f.s === A.f.e ? ymLbl(A.f.s) : ymLbl(A.f.s) + '–' + ymLbl(A.f.e)} is <b>${egp(sm.rev)}</b> across ${fmtInt(sm.entries)} car entries and ${fmtInt(sm.vins)} vehicles.` });
  if (py.lines) { const c = chg(sm.rev, py.rev); out.push({ text: `That is ${c >= 0 ? 'up' : 'down'} <b>${pct(Math.abs(c))}</b> on the same months of ${Math.floor(A.f.s / 100) - 1} (${egp(py.rev)}); car entries ${chg(sm.entries, py.entries) >= 0 ? 'rose' : 'fell'} ${pct(Math.abs(chg(sm.entries, py.entries)))}.`, warn: c < 0 }); }
  if (Number.isFinite(ach.ach)) {
    const rows = ach.rows.filter(r => r.target > 0); const on = rows.filter(r => C.targetStatus(r.ach) === 'on'), below = rows.filter(r => C.targetStatus(r.ach) === 'below');
    out.push({ text: `Network achievement is <b>${achPct(ach.ach)}</b> of a ${egp(ach.target)} target. ${on.length} of ${rows.length} units are on target${below.length ? `; ${below.length} are more than 10% below (${below.sort((a, b) => a.ach - b.ach).slice(0, 4).map(r => `${esc(r.unit)} ${achPct(r.ach)}`).join(', ')})` : ''}.`, warn: C.targetStatus(ach.ach) !== 'on' });
    const top = rows.slice().sort((a, b) => b.ach - a.ach)[0]; if (top) out.push({ text: `Highest achievement: <b>${esc(top.unit)}</b> at ${achPct(top.ach)}.` });
  }
  if (py.lines && Number.isFinite(sm.rate) && Number.isFinite(py.rate)) { const d = sm.rate - py.rate; out.push({ text: `Discount rate is ${pct(sm.rate)}, ${Math.abs(d * 100).toFixed(1)} percentage points ${d >= 0 ? 'higher' : 'lower'} than a year earlier; ${fmtInt(sm.discRos)} repair orders carried a discount.`, warn: d > 0.005 }); }
  if (sm.rev) out.push({ text: `Warranty is ${pct(sm.payer[1] / sm.rev)} of revenue and PDI ${pct(sm.payer[2] / sm.rev)}; customer-pay makes up the remaining ${pct(sm.payer[0] / sm.rev)}.` });
  const cov = cur.cov; if (cov.missing.length) out.push({ text: `No transaction file is loaded for ${cov.missing.map(ymLbl).join(', ')}. Totals for the period are incomplete.`, warn: true });
  const unm = [...A.S.plants.values()].filter(p => !p.branch); if (unm.length) out.push({ text: `${unm.length} plant name(s) are not mapped to a branch (${unm.map(p => esc(p.raw)).join(', ')}). Their revenue is kept under "unmapped" until mapped in Data & imports.`, warn: true });
  const unk = A.S.advs.filter((a, i) => A.S.advInfo[i].status === 'unknown'); if (unk.length) out.push({ text: `${unk.length} advisor code(s) have no name mapping: ${unk.slice(0, 6).map(esc).join(', ')}.`, warn: true });
  if (cur.days.missing.length) out.push({ text: `Working days are missing for ${cur.days.missing.map(ymLbl).join(', ')}, so revenue per working day is not shown for the full period.`, warn: true });
  return out;
}

/* ======================= page: trends ======================= */
function pageTrends() {
  const S = A.S, g = A.f.group;
  const f = Object.assign(F(), { branches: curSet(true) });
  const idx = C.select(S, f);
  const sr = C.series(S, idx, f, g, A.mode === 'compare', A.coverage);
  const names = branchNames();
  const chosenCount = A.chosen.size || names.length;
  let h = `<div class="section"><h2>Trend view</h2><p>Combined mode sums the selected branches for each period. Compare mode draws one consistently coloured line per branch. Quarterly and yearly discount rates are calculated from summed revenue and discount, never by averaging percentages. Activities included: <b>${A.f.act === 'all' ? 'EM + BS + PDI' : A.f.act}</b>.</p>
  <div class="choices">${[['combined', 'Combined branches'], ['compare', 'Compare branches']].map(x => `<label class="choice ${A.mode === x[0] ? 'on' : ''}"><input type="radio" name="mode" value="${x[0]}" ${A.mode === x[0] ? 'checked' : ''} data-act="mode"> ${x[1]}</label>`).join('')}</div>
  ${A.f.branch === 'all' ? `<p style="margin-top:8px"><b>Branches:</b> ${A.chosen.size ? chosenCount + ' selected' : 'all ' + names.length + ' permitted branches'}. Tick to narrow the selection.</p><div class="choices">${names.map(b => `<label class="choice"><input type="checkbox" data-act="pick" value="${esc(b)}" ${A.chosen.has(b) ? 'checked' : ''}><i class="sw" style="background:${branchColor(b)}"></i>${esc(b)}</label>`).join('')}${A.chosen.size ? '<button class="btn small secondary" data-act="pickclear">Use all branches</button>' : ''}</div>` : `<p><b>Branch:</b> ${esc(A.f.branch)}. Choose “All branches” in the filter bar to compare several.</p>`}
  <div class="mini">Periods marked partial have missing months or end at the latest billing date (${dayLbl(S.maxDay)}). Shaded columns have no source file loaded, which is different from zero activity.</div></div>`;
  const buckets = sr.info.map(i => i.bucket);
  const missing = sr.info.map(i => i.status === 'missing');
  const groups = A.mode === 'compare' ? [...new Set(sr.points.map(p => p.branch))] : ['Combined'];
  const mk = key => groups.map(gn => ({ name: gn === 'Combined' ? 'Selected branches' : gn, color: gn === 'Combined' ? (key === 'rate' ? 'var(--mag)' : key === 'disc' ? 'var(--c3)' : 'var(--blue)') : branchColor(gn), values: buckets.map(b => { const p = sr.points.find(x => x.bucket === b && x.branch === gn); return p && p.hasData ? (key === 'rate' ? (Number.isFinite(p.rate) ? p.rate : null) : p[key]) : (p && p.status !== 'missing' ? (key === 'rate' ? null : 0) : null); }), status: buckets.map(b => (sr.info.find(i => i.bucket === b) || {}).status) }));
  const statusLbl = (st, has) => (st === 'partial' ? ' <span class="tag near">Partial</span>' : st === 'missing' ? (has ? ' <span class="tag near">Late-posted lines only</span>' : ' <span class="tag">No data</span>') : '');
  for (const [k, title, desc, fmt] of [['rev', 'A. Revenue trend — EGP', 'Signed net revenue; refunds and negative adjustments included.', 'money'], ['disc', 'B. Discount value trend — EGP', 'Sum of source discount values.', 'money'], ['rate', 'C. Discount rate trend — %', 'Total discount ÷ (revenue + discount) for each period.', 'pct']]) {
    const series = mk(k);
    const rows = sr.points.map(p => ({ _cls: p.missing ? 'missing' : '', cells: [`${esc(p.bucket)}${A.mode === 'compare' ? ' · ' + esc(p.branch) : ''}${statusLbl(p.status, p.hasData)}`, p.missing ? 'No data' : k === 'rate' ? pct(p.rate) : egp(p[k] || 0), p.missing ? '' : fmtInt(p.ros)] }));
    if (k === 'rate') h += discountByBranchSection(f);
    h += sec(title, desc, lineChart({ labels: buckets, series, missing, fmt, aria: title }) + `<details class="box"><summary>Exact values</summary>${table(['Period' + (A.mode === 'compare' ? ' · branch' : ''), k === 'rate' ? 'Discount rate' : k === 'rev' ? 'Revenue' : 'Discount', 'Repair orders'], rows, { maxH: 420 })}</details>`, k === 'rev' ? `<button class="btn small secondary" data-act="trendpdf">Trends PDF</button>` : '');
  }
  h += dailyBillingSection();
  return h;
}

/* ======================= page: PDI & retention ======================= */
function pagePdi() {
  const S = A.S;
  const br = curSet(false);
  const r = C.retention(S, { quarters: A.ret.q, type: A.ret.type, branches: br, fromYm: A.f.s, toYm: A.f.e });
  const t = r.tot;
  // the same PDI months one year earlier: count and change, rates in percentage points
  const ly = C.retention(S, { quarters: A.ret.q, type: A.ret.type, branches: br, fromYm: A.f.s - 100, toYm: A.f.e - 100 }).tot, hasLy = ly.pdi > 0;
  // the whole previous calendar year (Jan–Dec), to see how much of last year's PDI count this period already reached
  const fyY = Math.floor(A.f.e / 100) - 1, fy = C.retention(S, { quarters: A.ret.q, type: A.ret.type, branches: br, fromYm: fyY * 100 + 1, toYm: fyY * 100 + 12 }).tot, hasFy = fy.pdi > 0;
  // and the period just before (for one month: the month before)
  const pr = prevRange(), pv = C.retention(S, { quarters: A.ret.q, type: A.ret.type, branches: br, fromYm: pr.s, toYm: pr.e }).tot, hasPv = pv.pdi > 0;
  const pdiCmpCard = (label, word, per, t0, o, has, tc) => ({ label, value: has ? fmtInt(o.pdi) : 'N/A', count: true, t: tc, note: has ? `(${per}), with return rate ${pct(o.rate)} and same-branch rate ${pct(o.sameRate)}<div style="margin-top:4px">Change vs ${word} ${deltaChip(chg(t0.pdi, o.pdi))} (${t0.pdi - o.pdi >= 0 ? '+' : ''}${fmtInt(t0.pdi - o.pdi)} vehicles)</div>` : `${per}: not loaded` });
  const lyN = (now, then) => (hasLy ? `<div style="margin-top:4px">Same period last year ${fmtInt(then)} ${deltaChip(chg(now, then))}</div>` : '<div class="mini" style="margin-top:4px">Last year not loaded</div>');
  const lyR = (now, then, inv) => (hasLy ? `<div style="margin-top:4px">Same period last year ${pct(then)} ${ppChip(now - then, inv)}</div>` : '<div class="mini" style="margin-top:4px">Last year not loaded</div>');
  let h = `<div class="section"><h2>Return window and visit type</h2><p>Cohorts group vehicles by the calendar quarter of their earliest recorded PDI. A qualifying return must happen after the PDI date and within the window, at any branch in the network. Branch filters select the PDI branch of the cohort. The From/To months in the filter bar select PDI dates.</p>
  <div class="choices">${[1, 2, 3, 4].map(q => `<label class="choice ${A.ret.q === q ? 'on' : ''}"><input type="radio" name="retq" data-act="retq" value="${q}" ${A.ret.q === q ? 'checked' : ''}> ${q} quarter${q > 1 ? 's' : ''} (${q * 3} months)</label>`).join('')}</div>
  <div class="choices">${Object.entries(C.RETURN_TYPES).map(([k, v]) => `<label class="choice ${A.ret.type === k ? 'on' : ''}"><input type="radio" name="rett" data-act="rett" value="${k}" ${A.ret.type === k ? 'checked' : ''}> ${v.label}</label>`).join('')}</div></div>`;
  h += cards([
    { label: 'PDI vehicles — proxy for sales', value: fmtInt(t.pdi), count: true, note: 'Distinct VINs, earliest PDI event', t: '' },
    pdiCmpCard('PDI vehicles — same period last year', 'same period last year', periodText({ s: A.f.s - 100, e: A.f.e - 100 }), t, ly, hasLy, 't-blue'),
    { label: `PDI vehicles — last year (Jan–Dec ${fyY})`, value: hasFy ? fmtInt(fy.pdi) : 'N/A', count: true, t: 't-mag', note: hasFy ? `Full year ${fyY}, all 12 months<div style="margin-top:4px">${esc(periodText(A.f))} = <b>${pct(fy.pdi ? t.pdi / fy.pdi : NaN)}</b> of it · difference ${t.pdi - fy.pdi >= 0 ? '+' : ''}${fmtInt(t.pdi - fy.pdi)} vehicles</div>` : `${fyY} not loaded` },
    { label: 'Eligible vehicles', value: fmtInt(t.eligible), count: true, note: `Full ${A.ret.q * 3}-month window observable by ${dayLbl(r.cutoff)}`, t: 't-blue' },
    { label: 'Return rate', value: pct(t.rate), note: `${fmtInt(t.returned)} returned · ${r.label.toLowerCase()}`, t: 't-mag' },
    { label: 'Same-branch retention', value: pct(t.sameRate), note: `${fmtInt(t.same)} returned to their PDI branch`, t: 't-dark' },
    { label: 'No recorded return', value: pct(t.noRate), note: `${fmtInt(t.noReturn)} eligible vehicles with no return in the available data` },
    { label: 'Not yet eligible', value: fmtInt(t.pending), count: true, note: `Pending; excluded from rates, not counted as non-returners`, t: 't-amber' },
  ], 'Key figures');
  h += sec('Return rate by PDI cohort', `${r.label}, ${A.ret.q * 3}-month window. Cohorts with no eligible vehicles show N/A.`, hbars(r.rows.map(c => ({ label: c.key, segs: [{ v: Number.isFinite(c.rate) ? c.rate : 0, color: 'var(--blue)' }], value: pct(c.rate), sub: `${fmtInt(c.eligible)} eligible · ${fmtInt(c.pending)} pending` })), { max: 1, aria: 'Return rate by cohort', emptyText: 'No PDI events in the selected months and branches.' }));
  h += sec('Cohort detail', '“No recorded return” means no qualifying visit in the loaded data. Same-branch returns are always a subset of network returns.', table(['PDI quarter', 'PDI VINs', 'Eligible', 'Returned', 'Return %', 'No recorded return', 'No-return %', 'Same-branch', 'Same-branch %', 'Not yet eligible'], r.rows.map(c => [c.key, fmtInt(c.pdi), fmtInt(c.eligible), fmtInt(c.returned), pct(c.rate), fmtInt(c.noReturn), pct(c.noRate), fmtInt(c.same), pct(c.sameRate), fmtInt(c.pending)]).concat(r.rows.length ? [{ _cls: 'total', cells: ['Total', fmtInt(t.pdi), fmtInt(t.eligible), fmtInt(t.returned), pct(t.rate), fmtInt(t.noReturn), pct(t.noRate), fmtInt(t.same), pct(t.sameRate), fmtInt(t.pending)] }] : [])));
  const firstYm = C.ymOf(S.minDay);
  h += `<div class="notice">Data starts ${dayLbl(S.minDay)}. Vehicles whose PDI happened before that date are not visible as PDI events, and returns after ${dayLbl(r.cutoff)} are not yet in the data.${firstYm > 202401 ? ' Upload earlier months to extend the cohort history.' : ''}</div>`;
  return h;
}

/* ======================= shared: revenue rows (revenue · ROs · VTP) ======================= */
const achCls = ach => { const st = C.targetStatus(ach); return st === 'on' ? 'on' : st === 'near' ? 'near' : st === 'below' ? 'below' : ''; };
const achLine = (rev, target) => (Number.isFinite(target) && target > 0 ? `<span class="ach ${achCls(rev / target)}">(${achPct(rev / target)} of ${compact(target)})</span>` : '<span class="mini">No target</span>');
const achText = ach => (Number.isFinite(ach) ? `<span class="ach ${achCls(ach)}">${achPct(ach)}</span>` : '<span class="mini">N/A</span>');
const roVtp = sm => `${fmtInt(sm.ros)} ROs · ${fmtInt(sm.vins)} VTP`;
/* change against the same period last year, in brackets: (+5.2%) green, (−3.1%) red; nothing when last year has no data */
const lyPct = (now, then) => { const d = chg(now, then); if (!Number.isFinite(d)) return then === 0 && now > 0 ? ' <span class="mini">(new)</span>' : ''; const v = (d * 100).toFixed(1); return ` <span style="font-weight:700;color:var(${d > 0.0005 ? '--on' : d < -0.0005 ? '--below' : '--muted'})">(${d > 0 ? '+' : ''}${v}%)</span>`; };
const roVtpLy = (sm, ly) => (ly ? `${fmtInt(sm.ros)} ROs${lyPct(sm.ros, ly.ros)} · ${fmtInt(sm.vins)} VTP${lyPct(sm.vins, ly.vins)}` : roVtp(sm));
const statusColor = ach => { const c = achCls(ach); return c === 'on' ? 'var(--on)' : c === 'near' ? 'var(--amber)' : c === 'below' ? 'var(--below)' : 'var(--blue)'; };
const trendMark = (a, b, invert) => { const d = chg(a, b); if (!Number.isFinite(d)) return '<span class="arrow flat">—</span>'; const up = d > 0.0005, dn = d < -0.0005, good = invert ? dn : up, bad = invert ? up : dn; return `<span class="arrow ${good ? 'up' : bad ? 'down' : 'flat'}">${up ? '▲' : dn ? '▼' : '■'} ${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%</span>`; };
/* list: [{label, sm, color?, target?, segs?}] — value column shows revenue, then ROs · VTP, then achievement when a target exists */
function revRows(list, o) {
  o = o || {};
  return hbars(list.map(x => ({
    label: x.label,
    segs: x.segs || [{ v: x.sm.rev, color: x.color || (o.byStatus && x.target > 0 ? statusColor(x.sm.rev / x.target) : 'var(--blue)') }],
    marker: x.target > 0 ? x.target : 0,
    value: `<b>${egpC(x.sm.rev)}</b>${x.ly ? lyPct(x.sm.rev, x.ly.rev) : ''}`,
    sub: (x.ly !== undefined ? roVtpLy(x.sm, x.ly) : roVtp(x.sm)) + (x.target > 0 || o.showTarget ? '<br>' + achLine(x.sm.rev, x.target) : '') + (x.extra ? '<br>' + x.extra : ''),
  })), o);
}
const branchSort = (a, b) => { const ia = BRANCH_ORDER.indexOf(a), ib = BRANCH_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); };
const miniCard = (title, body, right) => { const k = NUM.subs.length; NUM.subs.push({ title: txt(title), desc: '', blocks: NUM.pending, subs: [] }); NUM.pending = []; return `<div class="mcard"><div class="mcard-h"><h3>@@SUB${k}@@${title}</h3>${right || ''}</div>${body}</div>`; };

/* ======================= page: branches ======================= */
function branchTargets(f) {
  // per-branch target & revenue (target units only) for the given filter
  const S = A.S, ach = C.achievement(S, A.T, f), out = new Map();
  for (const r of ach.rows) { const bi = S.unitBranch[r.ui]; const o = out.get(bi) || { rev: 0, target: 0 }; if (r.target > 0) { o.rev += r.rev; o.target += r.target; } out.set(bi, o); }
  return { by: out, ach };
}
function pageBranches() {
  const S = A.S, cur = stats(A.f.s, A.f.e);
  const allF = F({ act: 'all' }), allIdx = C.select(S, allF);
  const byB = C.groupBy(S, cur.idx, i => S.br[i]);
  const tg = branchTargets(cur.f);
  const rows = [...byB].map(([bi, ix]) => ({ bi, name: S.branches[bi], sm: C.summarize(S, ix), t: tg.by.get(bi) })).sort((a, b) => b.sm.rev - a.sm.rev);
  let h = '';
  // 1. achievement
  const achList = rows.map(r => ({ label: r.name, sm: r.sm, target: r.t && r.t.target > 0 && A.f.act !== 'PDI' ? r.t.target : 0 }));
  h += sec('Branch achievement', `Revenue against target for ${ymLbl(A.f.s)}${A.f.s !== A.f.e ? '–' + ymLbl(A.f.e) : ''}. Green is 100% or more, amber within 10% of target, red more than 10% below. The black tick marks the target.`, revRows(achList, { byStatus: true, aria: 'Branch achievement' }) + `<div class="legend"><span><i class="sw sq" style="background:var(--on)"></i>On target (≥ 100%)</span><span><i class="sw sq" style="background:var(--amber)"></i>Within 10%</span><span><i class="sw sq" style="background:var(--below)"></i>More than 10% below</span><span><i class="sw sq" style="background:var(--blue)"></i>No target</span><span><i class="sw sq" style="background:var(--fg);width:3px"></i>Target</span></div>`);
  h += statusGroupsSection();
  // 2. combined mix
  const byBC = C.groupBy(S, cur.idx, i => S.br[i] * 4 + S.cw[i]);
  const cw = (bi, k) => { const ix = byBC.get(bi * 4 + k); return ix ? C.summarize(S, ix) : null; };
  const mixAct = rows.map(r => ({ label: r.name, sm: r.sm, segs: [0, 1, 2].map(i => ({ v: r.sm.act[i], color: `var(--c${i + 1})`, name: ACT_NAMES[i], label: egp(r.sm.act[i]) })) }));
  const mixPay = rows.map(r => ({ label: r.name, sm: r.sm, segs: [0, 1, 2].map(k => { const s2 = cw(r.bi, k); return { v: s2 ? s2.rev : 0, color: ['var(--c4)', 'var(--c5)', 'var(--c3)'][k], name: ['Cash', 'Warranty', 'PDI'][k], label: egp(s2 ? s2.rev : 0) }; }) }));
  h += `<div class="two">${sec('EM, BS and PDI — all branches', 'One combined view: each bar splits the branch revenue by activity.', revRows(mixAct, { legend: [['EM', 'var(--c1)'], ['BS', 'var(--c2)'], ['PDI', 'var(--c3)']], aria: 'Activity mix by branch' }))}${sec('Cash and warranty — all branches', 'Each bar splits the branch revenue by payer (C/W column).', revRows(mixPay, { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)'], ['PDI', 'var(--c3)']], aria: 'Payer mix by branch' }))}</div>`;
  // 3. separate charts: EM, BS (unit scope with targets), Cash, Warranty
  const byUnit = C.groupBy(S, allIdx, i => S.unit[i]);
  const allAch = C.achievement(S, A.T, allF); const uT = new Map(allAch.rows.map(r => [r.ui, r.target]));
  const unitList = scope => [...byUnit].filter(([ui]) => S.unitScope[ui] === scope).map(([ui, ix]) => ({ label: S.branches[S.unitBranch[ui]], sm: C.summarize(S, ix), target: uT.get(ui) || 0 })).sort((a, b) => b.sm.rev - a.sm.rev);
  const payList = k => rows.map(r => ({ label: r.name, sm: cw(r.bi, k) })).filter(x => x.sm).sort((a, b) => b.sm.rev - a.sm.rev);
  const showEM = !['BS', 'PDI'].includes(A.f.act), showBS = !['EM', 'PDI', 'EM+PDI'].includes(A.f.act);
  if (!showEM || !showBS) h += `<div class="notice">Activity filter <b>${esc(A.f.act.replace('+', ' + '))}</b>: ${!showEM && !showBS ? 'EM and BS unit charts are' : !showEM ? 'the EM unit chart is' : 'the BS unit chart is'} hidden.</div>`;
  if (showEM || showBS) h += `<div class="${showEM && showBS ? 'two' : ''}">${showEM ? sec('EM by branch', 'Mechanical workshop units against their targets. PDI counts toward EM, matching the target reports.', revRows(unitList('EM'), { byStatus: true, aria: 'EM by branch' })) : ''}${!showBS ? '' : sec('BS by branch', 'Body-shop units against their own targets.', revRows(unitList('BS'), { byStatus: true, aria: 'BS by branch', emptyText: 'No body-shop revenue in this selection.' }))}</div>`;
  h += `<div class="two">${sec('Cash (customer-pay) by branch', 'Revenue with C/W = Cash, including insurance and fleet accounts.', revRows(payList(0).map(x => Object.assign(x, { color: 'var(--c4)' })), { aria: 'Cash by branch' }))}${sec('Warranty by branch', 'Revenue with C/W = Warranty.', revRows(payList(1).map(x => Object.assign(x, { color: 'var(--c5)' })), { aria: 'Warranty by branch', emptyText: 'No warranty revenue in this selection.' }))}</div>`;
  // 4. each branch separately
  const cardsHtml = rows.map(r => {
    const units = [...byUnit].filter(([ui]) => S.unitBranch[ui] === r.bi).sort((a, b) => S.unitScope[a[0]].localeCompare(S.unitScope[b[0]]));
    const list = units.map(([ui, ix]) => ({ label: S.unitScope[ui] === 'EM' ? 'EM (incl. PDI)' : 'BS', sm: C.summarize(S, ix), target: uT.get(ui) || 0, color: S.unitScope[ui] === 'EM' ? 'var(--c1)' : 'var(--c2)' }));
    [0, 1].forEach(k => { const s2 = cw(r.bi, k); if (s2) list.push({ label: k ? 'Warranty' : 'Cash', sm: s2, color: k ? 'var(--c5)' : 'var(--c4)' }); });
    const t = r.t && r.t.target > 0 ? r.t : null;
    return miniCard(esc(r.name), revRows(list, { byStatus: false, max: Math.max(...list.map(x => Math.max(x.sm.rev, x.target || 0)), 1) }), `<div class="mcard-v"><b>${egpC(r.sm.rev)}</b>${t ? achLine(t.rev, t.target) : ''}</div>`);
  }).join('');
  h += sec('Each branch', 'EM and BS against their unit targets, then cash and warranty revenue.', `<div class="cardgrid">${cardsHtml}</div>`);
  // 5. revenue per working day
  h += revPerWdSection(rows);
  // 6. table
  h += sec('Branch table', 'Repair orders are distinct branch + RO; VTP is distinct vehicles per branch (network VTP is not the sum of branches).', table(['Branch', 'Revenue', 'Target', 'Achievement', 'EM', 'BS', 'PDI', 'Cash', 'Warranty', 'ROs', 'VTP', 'Rev / RO', 'Disc. rate'], rows.map(r => [esc(r.name), egp(r.sm.rev), r.t && r.t.target > 0 ? egp(r.t.target) : '—', r.t && r.t.target > 0 ? achBar(r.t.rev / r.t.target) : '<span class="mini">No target</span>', egp(r.sm.act[0]), egp(r.sm.act[1]), egp(r.sm.act[2]), egp(r.sm.payer[0]), egp(r.sm.payer[1]), fmtInt(r.sm.ros), fmtInt(r.sm.vins), egp(r.sm.revPerRo), pct(r.sm.rate)]).concat([{ _cls: 'total', cells: ['Network', egp(cur.sm.rev), egp(cur.ach.target), achBar(cur.ach.ach), egp(cur.sm.act[0]), egp(cur.sm.act[1]), egp(cur.sm.act[2]), egp(cur.sm.payer[0]), egp(cur.sm.payer[1]), fmtInt(cur.sm.ros), fmtInt(cur.sm.vins), egp(cur.sm.revPerRo), pct(cur.sm.rate)] }])));
  return h;
}
function revPerWdSection(rows) {
  const S = A.S, months = [];
  for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  if (months.length < 12) { const first = C.ymAdd(A.f.e, -11); months.length = 0; for (let m = Math.max(first, C.ymOf(S.minDay)); m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m); }
  const vals = months.map(m => { const st = stats(m, m); return Number.isFinite(st.revWd) && st.sm.lines ? st.revWd : null; });
  const statusArr = months.map(m => (m === C.ymOf(S.maxDay) && S.maxDay % 100 < C.daysInMonth(m) ? 'partial' : 'complete'));
  const chart = lineChart({ labels: months.map(ymLbl), series: [{ name: 'Revenue per working day', color: 'var(--blue)', values: vals, status: statusArr }], missing: months.map(m => !A.coverage.has(m)), fmt: 'money', aria: 'Revenue per working day', emptyText: 'Working days come from the target reports; none are loaded for these months.' });
  const strip = `<div class="wdstrip">${months.map((m, i) => { const v = vals[i], p = i ? vals[i - 1] : null; return `<div><span>${ymLbl(m)}</span><b>${v == null ? '—' : compact(v)}</b>${v != null && p != null ? trendMark(v, p) : '<span class="arrow flat">—</span>'}</div>`; }).join('')}</div>`;
  // branch: current period vs previous period of the same length
  const len = (Math.floor(A.f.e / 100) * 12 + A.f.e % 100) - (Math.floor(A.f.s / 100) * 12 + A.f.s % 100) + 1;
  const ps = C.ymAdd(A.f.s, -len), pe = C.ymAdd(A.f.e, -len);
  const cur = stats(A.f.s, A.f.e), prev = stats(ps, pe);
  const prevBy = C.groupBy(S, prev.idx, i => S.br[i]);
  const brRows = rows.map(r => { const pr = prevBy.get(r.bi); const a = r.sm.rev / cur.days.wd, b = pr ? C.summarize(S, pr).rev / prev.days.wd : NaN; return { r, a, b }; });
  const maxv = Math.max(...brRows.map(x => Math.max(x.a || 0, x.b || 0)), 1);
  const brChart = hbars(brRows.map(x => ({ label: x.r.name, segs: [{ v: x.a || 0, color: 'var(--blue)' }], value: `<b>${egpC(x.a)}</b>`, sub: Number.isFinite(x.b) ? `${trendMark(x.a, x.b)}<br><span class="mini">${ymLbl(ps)}${len > 1 ? '–' + ymLbl(pe) : ''}: ${egpC(x.b)}</span>` : '<span class="mini">No comparison data</span>' })), { max: maxv, aria: 'Revenue per working day by branch' });
  const wdNote = cur.days.missing.length ? `<div class="notice">Working days missing for ${cur.days.missing.map(ymLbl).join(', ')}: per-day figures for the selected period are not available. Upload those months' target reports.</div>` : '';
  return sec('Revenue per working day', 'Monthly trend for the selected branch filter, with ▲ / ▼ against the previous month. Working days come from the target reports; partial months use days elapsed.', chart + strip) + sec('Revenue per working day by branch', `${ymLbl(A.f.s)}${len > 1 ? '–' + ymLbl(A.f.e) : ''} against the previous ${len} month${len > 1 ? 's' : ''} (${ymLbl(ps)}${len > 1 ? '–' + ymLbl(pe) : ''}).`, wdNote + brChart);
}

/* ======================= page: models ======================= */
/* "how many to show" choices for the top charts (also used by the PowerPoint and PDF) */
const TOP_CFG = {
  rev: { opts: [5, 10, 15], def: 5, word: 'Models shown' },
  advEM: { opts: [5, 10], def: 10, word: 'Advisors shown' },
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map(k => [`focus${k}`, { opts: [5, 10, 15, 0], def: 10, word: 'Part numbers shown' }])),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map(k => [`focusBr${k}`, { opts: [5, 10, 15, 0], def: 10, word: 'Part numbers in each branch' }])),
  advBS: { opts: [5, 10], def: 10, word: 'Advisors shown' },
  ent: { opts: [5, 10, 15], def: 5, word: 'Models shown' },
  pn: { opts: [5, 10, 20, 30, 40, 50], def: 5, word: 'Part numbers shown' },
  pcash: { opts: [5, 10, 15, 20, 25], def: 5, word: 'Part numbers shown' },
  pwar: { opts: [5, 10, 15, 20, 25], def: 5, word: 'Part numbers shown' },
};
function modelTop() {
  if (!A.modelTop) { A.modelTop = {}; try { const v = JSON.parse(localStorage.getItem('ps.topN') || 'null'); if (v) Object.assign(A.modelTop, v); } catch (e) {} }
  for (const k in TOP_CFG) if (!TOP_CFG[k].opts.includes(A.modelTop[k])) A.modelTop[k] = TOP_CFG[k].def;
  return A.modelTop;
}
function modelTopSel(k, total, id) {
  const v = modelTop()[k], c = TOP_CFG[k];
  return `<label class="mini" style="display:flex;gap:6px;align-items:center;white-space:nowrap">${c.word} <select class="cell" data-act="modeltop" data-k="${k}"${id ? ` id="${id}"` : ''} title="Also used in the PowerPoint and PDF">${c.opts.map(n => `<option value="${n}" ${v === n ? 'selected' : ''}>${n === 0 ? 'All' : 'Top ' + n}</option>`).join('')}</select></label>`;
}
/* car entries and VTP per branch for this period, the previous period and the same period last year (shared by 11.5 and the calendar-day table) */
function branchPeriods(cur) {
  const S = A.S, pr = prevRange(), key = JSON.stringify([A.f.s, A.f.e, A.f.branch, A.f.act, A.f.pay, A.f.noOW, S.n]);
  if (A._brP && A._brP.key === key && A._brP.S === S) return A._brP.res;
  const prv = stats(pr.s, pr.e), ly = stats(A.f.s - 100, A.f.e - 100);
  const by = st => { const g = C.groupBy(S, st.idx, i => S.br[i]), m = new Map(); for (const [b, ix] of g) m.set(b, { sm: C.summarize(S, ix), ix }); return m; };
  const res = { cur, prv, ly, pr, c: by(cur), p: by(prv), l: by(ly), hasP: prv.sm.lines > 0, hasL: ly.sm.lines > 0, pL: periodText(pr), lL: periodText({ s: A.f.s - 100, e: A.f.e - 100 }) };
  A._brP = { key, S, res }; return res;
}
function branchEntriesTable(cur) {
  const S = A.S, R0 = branchPeriods(cur), { c, p, l, hasP, hasL, pL, lL, prv, ly } = R0;
  const cmp = (now, then, has) => (!has ? '<span class="mini">not loaded</span>' : then == null ? '—' : `${fmtInt(then)} ${deltaChip(chg(now, then))}`);
  const topModel = ix => { const m = new Map(); for (const i of ix) { if (S.act[i] === 2) continue; m.set(S.model[i], (m.get(S.model[i]) || 0) + 1); } let best = null; for (const [k, v] of m) if (!best || v > best[1]) best = [k, v]; return best ? `${esc(S.models[best[0]] || '—')}` : '—'; };
  const models = ix => new Set(ix.map(i => S.model[i])).size;
  // per working day (working days from the target reports); the change is per working day, so months of different length compare fairly
  const wC = cur.days.wd, wP = prv.days.wd, wL = ly.days.wd;
  const perWd = (now, then, then2) => { if (!(wC > 0)) return '<span class="mini">no working days</span>'; const v = now / wC, a = then != null && wP > 0 ? then / wP : NaN, b2 = then2 != null && wL > 0 ? then2 / wL : NaN; return `<b>${fmtNum1(v)}</b><div class="mini">${pL}: ${Number.isFinite(a) ? fmtNum1(a) + ' ' + deltaChip(chg(v, a)) : '—'}</div><div class="mini">${lL}: ${Number.isFinite(b2) ? fmtNum1(b2) + ' ' + deltaChip(chg(v, b2)) : '—'}</div>`; };
  const brs = [...c.keys()].sort((a, b) => c.get(b).sm.entries - c.get(a).sm.entries);
  const row = (name, x, y, z, ix) => [name, `<b>${fmtInt(x.entries)}</b>`, cmp(x.entries, y ? y.entries : null, hasP), cmp(x.entries, z ? z.entries : null, hasL), perWd(x.entries, y ? y.entries : null, z ? z.entries : null), `<b>${fmtInt(x.vins)}</b>`, cmp(x.vins, y ? y.vins : null, hasP), cmp(x.vins, z ? z.vins : null, hasL), perWd(x.vins, y ? y.vins : null, z ? z.vins : null), x.vins ? (x.entries / x.vins).toFixed(2) : '—', egpC(x.rev), egpC(x.entries ? x.rev / x.entries : NaN), fmtInt(models(ix)), topModel(ix)];
  const rows = brs.map(b => row(esc(S.branches[b]), c.get(b).sm, p.get(b) ? p.get(b).sm : null, l.get(b) ? l.get(b).sm : null, c.get(b).ix));
  rows.push({ _cls: 'total', cells: row('Network', cur.sm, hasP ? prv.sm : null, hasL ? ly.sm : null, cur.idx) });
  const wdTxt = wC > 0 ? `${fmtInt(wC)} working days (${pL}: ${wP > 0 ? fmtInt(wP) : 'n/a'} · ${lL}: ${wL > 0 ? fmtInt(wL) : 'n/a'})` : 'working days not available (target files missing)';
  return sec('Car entries and VTP in each branch', `Every branch, ${periodText(A.f)} against the previous period (${pL}) and the same period last year (${lL}): the earlier figure with the change. Per working day uses ${wdTxt}. Car entries = repair orders without PDI; VTP = distinct vehicles, including PDI vehicles (so a branch with many PDIs can show more VTP than entries). A vehicle seen in two branches counts in both, so the network VTP is lower than the sum. Calendar-day figures are at the end of this tab.`, table(['Branch', 'Car entries', `Entries — ${pL}`, `Entries — ${lL}`, 'Entries per working day', 'VTP', `VTP — ${pL}`, `VTP — ${lL}`, 'VTP per working day', 'Entries per VTP', 'Revenue', 'Revenue per entry', 'Models', 'Top model (entries)'], rows, { align: ['', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', ''] }));
}
/* the same per calendar day (every day of the month, Fridays and holidays included; the current month up to the last billing date) */
function branchCalendarTable(cur) {
  const S = A.S, { c, p, l, hasP, hasL, pL, lL, prv, ly } = branchPeriods(cur);
  const dC = cur.days.cd, dP = prv.days.cd, dL = ly.days.cd;
  const per = (now, d) => (d > 0 ? now / d : NaN);
  const cell = (v, then, dd, has) => (!has ? '<span class="mini">not loaded</span>' : then == null ? '—' : `${fmtNum1(per(then, dd))} ${deltaChip(chg(v, per(then, dd)))}`);
  const row = (name, x, y, z) => { const e = per(x.entries, dC), v = per(x.vins, dC); return [name, fmtInt(x.entries), `<b>${fmtNum1(e)}</b>`, cell(e, y ? y.entries : null, dP, hasP), cell(e, z ? z.entries : null, dL, hasL), fmtInt(x.vins), `<b>${fmtNum1(v)}</b>`, cell(v, y ? y.vins : null, dP, hasP), cell(v, z ? z.vins : null, dL, hasL), egpC(per(x.rev, dC))]; };
  const brs = [...c.keys()].sort((a, b) => c.get(b).sm.entries - c.get(a).sm.entries);
  const rows = brs.map(b => row(esc(S.branches[b]), c.get(b).sm, p.get(b) ? p.get(b).sm : null, l.get(b) ? l.get(b).sm : null));
  rows.push({ _cls: 'total', cells: row('Network', cur.sm, hasP ? prv.sm : null, hasL ? ly.sm : null) });
  return sec('Car entries and VTP in each branch — per calendar day', `${periodText(A.f)}: ${fmtInt(dC)} calendar days${cur.days.partial ? ' (to the last billing date)' : ''}; ${pL}: ${fmtInt(dP)}; ${lL}: ${fmtInt(dL)}. Every day counts, Fridays and holidays included. Each comparison shows the earlier period's figure per calendar day and the change.`, table(['Branch', 'Car entries', 'Entries per calendar day', `Per day — ${pL}`, `Per day — ${lL}`, 'VTP', 'VTP per calendar day', `Per day — ${pL}`, `Per day — ${lL}`, 'Revenue per calendar day'], rows, { align: ['', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num'] }));
}
function pageModels() {
  const S = A.S, cur = stats(A.f.s, A.f.e);
  const byM = C.groupBy(S, cur.idx, i => S.model[i]);
  const rows = [...byM].map(([mi, ix]) => ({ mi, label: S.models[mi], sm: C.summarize(S, ix) })).sort((a, b) => b.sm.rev - a.sm.rev);
  // two rankings side by side: highest revenue, and most car entries (repair orders without PDI)
  const byEnt = rows.filter(r => r.sm.entries > 0).sort((a, b) => b.sm.entries - a.sm.entries || b.sm.rev - a.sm.rev);
  // the same period last year, per model, for the (±%) beside ROs, entries and VTP
  const lyS = stats(A.f.s - 100, A.f.e - 100), hasLy = lyS.sm.lines > 0, lyM = new Map();
  if (hasLy) for (const [mi, ix] of C.groupBy(S, lyS.idx, i => S.model[i])) lyM.set(mi, C.summarize(S, ix));
  const lyOf = mi => (hasLy ? lyM.get(mi) || { ros: 0, vins: 0, entries: 0, rev: 0 } : null);
  const lyTxt = hasLy ? ` In brackets: the change against the same period last year (${periodText({ s: A.f.s - 100, e: A.f.e - 100 })}).` : ' (Last year is not loaded, so there is no comparison.)';
  // how many models each chart shows (on this tab and in the PowerPoint / PDF)
  const mt = modelTop(), nR = mt.rev && mt.rev < rows.length ? mt.rev : rows.length, nE = mt.ent && mt.ent < byEnt.length ? mt.ent : byEnt.length;
  const revChart = revRows(rows.slice(0, nR).map((r, k) => Object.assign({}, r, { label: `${k + 1}. ${r.label}`, ly: lyOf(r.mi) })), { aria: 'Models ranked by revenue' });
  const revSec = sec(`Top ${nR} models by revenue`, `Ranked from the highest revenue, out of ${rows.length} models (all of them are at the bottom of this tab). Under each value: repair orders and VTP (distinct vehicles).${lyTxt}`, revChart, modelTopSel('rev', rows.length));
  const entChart = hbars(byEnt.slice(0, nE).map((r, k) => ({ label: `${k + 1}. ${r.label}`, segs: [{ v: r.sm.entries, color: 'var(--c2)' }], value: `<b>${fmtInt(r.sm.entries)}</b> entries${hasLy ? lyPct(r.sm.entries, lyOf(r.mi).entries) : ''}`, sub: `${egpC(r.sm.rev)}${hasLy ? lyPct(r.sm.rev, lyOf(r.mi).rev) : ''} · ${fmtInt(r.sm.vins)} VTP${hasLy ? lyPct(r.sm.vins, lyOf(r.mi).vins) : ''}<br>${egpC(r.sm.entries ? r.sm.rev / r.sm.entries : NaN)} per entry` })), { aria: 'Models ranked by car entries', fmt: 'int' });
  let h = `<div class="two">${revSec}${sec(`Top ${nE} models by car entries`, `Ranked from the most car entries (repair orders without PDI), out of ${byEnt.length} models (all of them are at the bottom of this tab). Under each value: revenue, VTP and revenue per entry.${lyTxt}`, entChart, modelTopSel('ent', byEnt.length))}</div>`;
  h += modelShift(cur);
  // top 5 per branch
  const byBM = new Map();
  for (const i of cur.idx) { const k = S.br[i]; let m = byBM.get(k); if (!m) { m = new Map(); byBM.set(k, m); } let a = m.get(S.model[i]); if (!a) { a = []; m.set(S.model[i], a); } a.push(i); }
  const brs = [...byBM.keys()].sort((a, b) => branchSort(S.branches[a], S.branches[b]));
  // last year, per branch and model
  const lyBM = new Map();
  if (hasLy) { const g = new Map(); for (const i of lyS.idx) { const k = S.br[i] * 100000 + S.model[i]; let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(i); } for (const [k, ix] of g) lyBM.set(k, C.summarize(S, ix)); }
  const lyBMof = (bi, mi) => (hasLy ? lyBM.get(bi * 100000 + mi) || { ros: 0, vins: 0, entries: 0, rev: 0 } : undefined);
  h += sec('Top 5 models in each branch', `One card per branch with its five highest-revenue models.${lyTxt}`, `<details class="box"><summary>Show the chart</summary><div class="cardgrid">${brs.map(bi => { const list = [...byBM.get(bi)].map(([mi, ix]) => ({ label: S.models[mi], sm: C.summarize(S, ix), ly: lyBMof(bi, mi) })).sort((a, b) => b.sm.rev - a.sm.rev); const tot = list.reduce((t, x) => t + x.sm.rev, 0); return miniCard(esc(S.branches[bi]), revRows(list.slice(0, 5).map(x => Object.assign(x, { color: branchColor(S.branches[bi]), extra: `<span class="mini">${pct(tot ? x.sm.rev / tot : NaN)} of branch</span>` }))), `<div class="mcard-v"><b>${egpC(tot)}${hasLy ? lyPct(tot, [...lyBM].reduce((t, [k, v]) => t + (Math.floor(k / 100000) === bi ? v.rev : 0), 0)) : ''}</b><span class="mini">${list.length} models</span></div>`); }).join('')}</div></details>`);
  // every branch: car entries and VTP against the previous period and the same period last year
  h += branchEntriesTable(cur);
  // top 5 per month
  const trs = [];
  const byYmM = C.groupBy(S, cur.idx, i => S.ym[i]);
  for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) {
    const ix = byYmM.get(m) || [];
    if (!ix.length) { trs.push({ _cls: 'missing', cells: [ymLbl(m), '—', 'No data', '', '', '', '', '', '', '', '', '', ''] }); continue; }
    const mt = C.summarize(S, ix).rev;
    const list = [...C.groupBy(S, ix, i => S.model[i])].map(([mi, x]) => ({ name: S.models[mi], sm: C.summarize(S, x) })).sort((a, b) => b.sm.rev - a.sm.rev).slice(0, 5);
    list.forEach((x, k) => trs.push({ _cls: k === 0 ? 'grp' : '', cells: [k === 0 ? `<b>${ymLbl(m)}</b>` : '', String(k + 1), esc(x.name), egp(x.sm.rev), pct(mt ? x.sm.rev / mt : NaN), fmtInt(x.sm.ros), fmtInt(x.sm.entries), fmtInt(x.sm.vins), egp(x.sm.revPerRo), egp(x.sm.revPerVin), egp(x.sm.disc), pct(x.sm.rate), fmtInt(x.sm.perRos)] }));
  }
  h += sec('Top 5 models of each month', 'Ranked by revenue within each month of the selection.', '<details class="box"><summary>Show the chart</summary>' + table(['Month', '#', 'Model', 'Revenue', 'Share of month', 'ROs', 'Car entries', 'VTP', 'Rev / RO', 'Rev / VTP', 'Discount', 'Disc. rate', 'Periodic ROs'], trs, { align: ['', 'num', '', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num'] }) + '</details>');
  const allRev = revRows(rows.map((r, k) => Object.assign({}, r, { label: `${k + 1}. ${r.label}`, ly: lyOf(r.mi) })), { aria: 'All models ranked by revenue' });
  h += sec(`All ${rows.length} models by revenue`, 'Every model, ranked from the highest revenue, with repair orders and VTP.', `<details class="box"><summary>Show the chart</summary><div class="scrollbox">${allRev}</div></details>`);
  const allEnt = hbars(byEnt.map((r, k) => ({ label: `${k + 1}. ${r.label}`, segs: [{ v: r.sm.entries, color: 'var(--c2)' }], value: `<b>${fmtInt(r.sm.entries)}</b> entries${hasLy ? lyPct(r.sm.entries, lyOf(r.mi).entries) : ''}`, sub: `${egpC(r.sm.rev)}${hasLy ? lyPct(r.sm.rev, lyOf(r.mi).rev) : ''} · ${fmtInt(r.sm.vins)} VTP${hasLy ? lyPct(r.sm.vins, lyOf(r.mi).vins) : ''}<br>${egpC(r.sm.entries ? r.sm.rev / r.sm.entries : NaN)} per entry` })), { aria: 'All models ranked by car entries', fmt: 'int' });
  h += sec(`All ${byEnt.length} models by car entries`, 'Every model with car entries, ranked from the most, with revenue, VTP and revenue per entry.', `<details class="box"><summary>Show the chart</summary><div class="scrollbox">${allEnt}</div></details>`);
  h += sec(`Full model table (${rows.length} models)`, '', `<details class="box"><summary>Show the table</summary>${table(['Model', 'Revenue', 'Share', 'ROs', 'Car entries', 'VTP', 'Rev / RO', 'Rev / VTP', 'Periodic ROs', 'Disc. rate'], rows.map(r => [esc(r.label), egp(r.sm.rev), pct(cur.sm.rev ? r.sm.rev / cur.sm.rev : NaN), fmtInt(r.sm.ros), fmtInt(r.sm.entries), fmtInt(r.sm.vins), egp(r.sm.revPerRo), egp(r.sm.revPerVin), fmtInt(r.sm.perRos), pct(r.sm.rate)]), { maxH: 520 })}</details>`);
  h += branchCalendarTable(cur);
  return h;
}

/* ======================= page: advisors ======================= */
function pageAdvisors() {
  const S = A.S, cur = stats(A.f.s, A.f.e);
  // EM + BS, EM only and BS only, each as its own chart (PDI lines are excluded)
  const SCOPES = [['EM', 'EM', a => a === 0, 'var(--c1)'], ['BS', 'BS', a => a === 1, 'var(--c2)']];
  const idx = Array.from(cur.idx).filter(i => S.act[i] !== 2);
  const tag = ai => (S.advInfo[ai].status === 'unknown' ? ' <span class="tag below">Unmapped code</span>' : '');
  const sc = SCOPES.map(([k, name, ok, color]) => { const ix = idx.filter(i => ok(S.act[i])); const all = [...C.groupBy(S, ix, i => S.adv[i])].map(([ai, l]) => ({ ai, label: S.advs[ai], sm: C.summarize(S, l), color })).sort((a, b) => b.sm.rev - a.sm.rev); return { k, name, ix, all }; });
  let h = '';
  const unk = [...new Set(sc.flatMap(x => x.all).filter(r => S.advInfo[r.ai].status === 'unknown').map(r => r.ai))];
  if (unk.length) h += `<div class="notice">${unk.length} advisor code(s) have no name mapping and are shown by code. An administrator can name them in Data &amp; imports.</div>`;
  // top 5 or 10 for EM and for BS (the choice also applies in the PowerPoint and PDF)
  const top = x => { const n = modelTop()['adv' + x.k]; return sec(`Top ${n} advisors — ${x.name}`, 'Across all selected branches. Under each value: repair orders and VTP (distinct vehicles); PDI lines are excluded.', revRows(x.all.slice(0, n), { aria: `Top ${n} advisors ${x.name}` }), modelTopSel('adv' + x.k, x.all.length)); };
  h += `<div class="two">${top(sc[0])}${top(sc[1])}</div>`;
  h += `<div class="two">${sc.map(x => sec(`All ${x.all.length} advisors — ${x.name}`, '', `<div class="scrollbox">${revRows(x.all, { aria: `All advisors ${x.name}` })}</div>`)).join('')}</div>`;
  for (const x of sc) {
    const byBA = new Map();
    for (const i of x.ix) { const k = S.br[i]; let m = byBA.get(k); if (!m) { m = new Map(); byBA.set(k, m); } let a = m.get(S.adv[i]); if (!a) { a = []; m.set(S.adv[i], a); } a.push(i); }
    const brs = [...byBA.keys()].sort((a, b) => branchSort(S.branches[a], S.branches[b]));
    h += sec(`Advisors in each branch — ${x.name}`, 'Every advisor who billed in the branch, ranked by revenue.', brs.length ? `<div class="cardgrid">${brs.map(bi => { const list = [...byBA.get(bi)].map(([ai, ix]) => ({ label: S.advs[ai], sm: C.summarize(S, ix), color: branchColor(S.branches[bi]) })).sort((a, b) => b.sm.rev - a.sm.rev); const tot = C.summarize(S, [].concat(...[...byBA.get(bi).values()])); return miniCard(esc(S.branches[bi]), revRows(list), `<div class="mcard-v"><b>${egpC(tot.rev)}</b><span class="mini">${roVtp(tot)}</span></div>`); }).join('')}</div>` : '<div class="empty"><strong>No advisor revenue</strong>Nothing in this selection.</div>');
  }
  const byAA = C.groupBy(S, idx, i => S.adv[i] * 4 + S.act[i]);
  const trows = [...byAA].map(([k, ix]) => { const ai = Math.floor(k / 4), act = k % 4; return { ai, act, br: [...new Set(ix.map(i => S.branches[S.br[i]]))], sm: C.summarize(S, ix) }; }).sort((a, b) => b.sm.rev - a.sm.rev);
  h += sec('Advisor table', 'EM and BS are reported on separate rows.', table(['Advisor', 'Unit', 'Branches', 'Revenue', 'ROs', 'VTP', 'Rev / RO', 'Rev / VTP', 'Discount', 'Disc. rate', 'Discounted ROs', 'Periodic ROs'], trows.map(r => [`${esc(S.advs[r.ai])}${tag(r.ai)}`, ACT_NAMES[r.act], `<span class="mini">${esc(r.br.join(', '))}</span>`, egp(r.sm.rev), fmtInt(r.sm.ros), fmtInt(r.sm.vins), egp(r.sm.revPerRo), egp(r.sm.revPerVin), egp(r.sm.disc), pct(r.sm.rate), fmtInt(r.sm.discRos), fmtInt(r.sm.perRos)]), { align: ['', '', '', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num'], maxH: 560 }));
  h += adviserScorecard();
  return h;
}

/* ======================= trends: discount by branch ======================= */
function discountByBranchSection(f) {
  const S = A.S, idx = C.select(S, f);
  const rows = [...C.groupBy(S, idx, i => S.br[i])].map(([bi, ix]) => ({ name: S.branches[bi], sm: C.summarize(S, ix) })).sort((a, b) => b.sm.disc - a.sm.disc);
  const tot = C.summarize(S, idx);
  const body = hbars(rows.map(r => ({ label: r.name, segs: [{ v: Math.max(0, r.sm.disc), color: 'var(--c3)' }], value: `<b>${egpC(r.sm.disc)}</b>`, sub: `${pct(r.sm.rev ? r.sm.disc / r.sm.rev : NaN)} of ${egpC(r.sm.rev)} achieved<br><span class="mini">${fmtInt(r.sm.discRos)} discounted ROs</span>` })), { aria: 'Discount by branch' });
  return sec('Discount by branch', `Discount value per branch for the selected period, with its share of the revenue achieved. Network: ${egp(tot.disc)}, ${pct(tot.rev ? tot.disc / tot.rev : NaN)} of ${egp(tot.rev)} achieved.`, body + `<details class="box"><summary>Exact values</summary>${table(['Branch', 'Discount', 'Revenue achieved', 'Discount ÷ achieved', 'Discount rate (of gross)', 'Discounted ROs', 'ROs'], rows.map(r => [esc(r.name), egp(r.sm.disc), egp(r.sm.rev), pct(r.sm.rev ? r.sm.disc / r.sm.rev : NaN), pct(r.sm.rate), fmtInt(r.sm.discRos), fmtInt(r.sm.ros)]).concat([{ _cls: 'total', cells: ['Network', egp(tot.disc), egp(tot.rev), pct(tot.rev ? tot.disc / tot.rev : NaN), pct(tot.rate), fmtInt(tot.discRos), fmtInt(tot.ros)] }]))}</details>`);
}

/* ======================= page: comparison ======================= */
const ymIdx = ym => Math.floor(ym / 100) * 12 + (ym % 100) - 1;
function periodOptions(type) {
  const S = A.S, min = C.ymOf(S.minDay), max = C.ymOf(S.maxDay), out = [];
  const y0 = Math.floor(min / 100), y1 = Math.floor(max / 100);
  for (let y = y1; y >= y0; y--) {
    if (type === 'year') out.push({ key: String(y), label: String(y), s: y * 100 + 1, e: y * 100 + 12 });
    if (type === 'half') for (const hh of [2, 1]) { const s = y * 100 + (hh - 1) * 6 + 1, e = s + 5; if (e >= min && s <= max) out.push({ key: `${y}-H${hh}`, label: `H${hh} ${y}`, s, e }); }
    if (type === 'quarter') for (const q of [4, 3, 2, 1]) { const s = y * 100 + (q - 1) * 3 + 1, e = s + 2; if (e >= min && s <= max) out.push({ key: `${y}-Q${q}`, label: `Q${q} ${y}`, s, e }); }
    if (type === 'month') for (let m = 12; m >= 1; m--) { const ym = y * 100 + m; if (ym >= min && ym <= max) out.push({ key: String(ym), label: ymLbl(ym), s: ym, e: ym }); }
  }
  return out;
}
function cmpMetrics(st) {
  const sm = st.sm;
  return [
    ['Revenue', sm.rev, 'egp'], ['Target', st.ach.target, 'egp'], ['Achievement', st.ach.ach, 'ach'], ['Car entries', sm.entries, 'int'], ['Repair orders', sm.ros, 'int'], ['VTP (unique vehicles)', sm.vins, 'int'],
    ['Revenue per RO', sm.revPerRo, 'egp'], ['Revenue per VTP', sm.revPerVin, 'egp'], ['Revenue per working day', st.revWd, 'egp'], ['Revenue per calendar day', st.revCd, 'egp'],
    ['EM revenue', sm.act[0], 'egp'], ['BS revenue', sm.act[1], 'egp'], ['PDI revenue', sm.act[2], 'egp'], ['Cash revenue', sm.payer[0], 'egp'], ['Warranty revenue', sm.payer[1], 'egp'],
    ['Discount', sm.disc, 'egp', true], ['Discount rate', sm.rate, 'pct', true], ['Discounted ROs', sm.discRos, 'int', true], ['Periodic-maintenance ROs', sm.perRos, 'int'], ['PDI vehicles', sm.pdiVins, 'int'],
  ];
}
const fmtM = (v, t) => (t === 'egp' ? egp(v) : t === 'pct' ? pct(v) : t === 'ach' ? achText(v) : fmtInt(v));
const chgM = (a, b, t, inv) => (t === 'pct' || t === 'ach' ? ppChip(a - b, inv) : trendMark(a, b, inv));
function cmpPicker(which, type) {
  const c = A.cmp;
  if (type === 'custom') { const mo = sel => monthOptions().map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${ymLbl(m)}</option>`).join(''); return `<div class="field"><label for="cmp-${which}s">Period ${which.toUpperCase()} from</label><select id="cmp-${which}s" data-cmp="${which}S">${mo(c[which + 'S'])}</select></div><div class="field"><label for="cmp-${which}e">to</label><select id="cmp-${which}e" data-cmp="${which}E">${mo(c[which + 'E'])}</select></div>`; }
  const opts = periodOptions(type);
  return `<div class="field wide"><label for="cmp-${which}">Period ${which.toUpperCase()}</label><select id="cmp-${which}" data-cmp="${which}">${opts.map(o => `<option value="${o.key}" ${c[which] === o.key ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
}
function cmpRange(which) {
  const c = A.cmp;
  if (c.ptype === 'custom') { const s = c[which + 'S'], e = c[which + 'E']; return { s: Math.min(s, e), e: Math.max(s, e), label: s === e ? ymLbl(s) : `${ymLbl(Math.min(s, e))}–${ymLbl(Math.max(s, e))}` }; }
  const o = periodOptions(c.ptype).find(x => x.key === c[which]) || periodOptions(c.ptype)[which === 'a' ? 0 : 1] || periodOptions(c.ptype)[0];
  return o ? { s: o.s, e: o.e, label: o.label } : null;
}
function cmpDefaults() {
  const c = A.cmp, S = A.S, max = C.ymOf(S.maxDay);
  if (!c.inited) {
    c.inited = true; c.aS = Math.floor(max / 100) * 100 + 1; c.aE = max; c.bS = c.aS - 100; c.bE = max - 100;
    const ms = monthOptions(); c.months = new Set(ms.slice(-3)); c.branches = new Set(branchNames().slice(0, 4));
  }
  if (c.ptype !== 'custom') { const opts = periodOptions(c.ptype); if (!opts.some(o => o.key === c.a)) c.a = opts[0] && opts[0].key; if (!opts.some(o => o.key === c.b)) c.b = (opts[1] || opts[0] || {}).key; }
}
function pageCompare() {
  const S = A.S; cmpDefaults();
  const c = A.cmp;
  const modes = `<div class="choices">${[['periods', 'Periods'], ['branches', 'Branches'], ['months', 'Selected months']].map(x => `<button class="choice ${c.mode === x[0] ? 'on' : ''}" data-act="cmpmode" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`;
  const pdiBox = `<label class="choice ${c.noPdi ? 'on' : ''}"><input type="checkbox" data-act="cmpnopdi" ${c.noPdi ? 'checked' : ''} ${!['all', 'nobs'].includes(actVal()) ? 'disabled' : ''}> Exclude PDI from the comparison</label>`;
  let h = `<div class="section"><div class="sec-head"><div><h2>Compare</h2><p>Compare two periods (quarter, half, year, month or any custom range), several branches side by side, or a set of months you pick. The branch and activity filters in the bar above still apply${c.mode === 'branches' ? '; branch comparison uses the From/To months above' : ''}.${c.noPdi ? ' <b>PDI lines are excluded</b>: revenue, ROs, VTP and achievement below leave out pre-delivery inspection.' : ''}</p></div>${modes}</div><div class="choices">${pdiBox}</div>`;
  if (c.mode === 'periods') {
    h += `<div class="choices">${[['quarter', 'Quarter'], ['half', 'Half year'], ['year', 'Year'], ['month', 'Month'], ['custom', 'Custom range']].map(x => `<button class="choice ${c.ptype === x[0] ? 'on' : ''}" data-act="cmptype" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div class="toolbar" style="margin:8px 0 0">${cmpPicker('a', c.ptype)}${cmpPicker('b', c.ptype)}</div></div>`;
    h += comparePeriods();
  } else if (c.mode === 'branches') {
    const names = branchNames();
    h += `<div class="choices">${names.map(b => `<label class="choice"><input type="checkbox" data-act="cmpbr" value="${esc(b)}" ${c.branches.has(b) ? 'checked' : ''}><i class="sw" style="background:${branchColor(b)}"></i>${esc(b)}</label>`).join('')}<button class="btn small secondary" data-act="cmpbrall">All</button><button class="btn small secondary" data-act="cmpbrnone">Clear</button></div></div>`;
    h += compareBranches();
  } else {
    const ms = monthOptions();
    const years = [...new Set(ms.map(m => Math.floor(m / 100)))];
    h += years.map(y => `<div class="choices"><span class="lbl" style="align-self:center;width:44px">${y}</span>${ms.filter(m => Math.floor(m / 100) === y).map(m => `<label class="choice"><input type="checkbox" data-act="cmpmonth" value="${m}" ${c.months.has(m) ? 'checked' : ''}>${MON[m % 100 - 1]}</label>`).join('')}</div>`).join('') + '</div>';
    h += compareMonths();
  }
  return h;
}
const cmpAct = () => { const a = actVal(); if (!A.cmp.noPdi) return a; return a === 'all' ? 'nopdi' : a === 'nobs' ? 0 : a; };
const cstats = (s, e, opts) => stats(s, e, Object.assign({ act: cmpAct() }, opts || {}));
function comparePeriods() {
  const S = A.S, a = cmpRange('a'), b = cmpRange('b');
  if (!a || !b) return '<div class="section empty"><strong>Not enough data</strong>Load more months to compare periods.</div>';
  const A1 = cstats(a.s, a.e), B1 = cstats(b.s, b.e);
  const covNote = (r, st) => (st.cov.missing.length ? ` <span class="tag near">${st.cov.missing.length} of ${st.cov.expected} months not loaded</span>` : st.days.partial && r.e >= C.ymOf(S.maxDay) ? ' <span class="tag near">Partial</span>' : '');
  const mA = cmpMetrics(A1), mB = cmpMetrics(B1);
  let h = `<div class="kpis">${[0, 2, 5, 8].map((k, n) => `<div class="kpi ${['', 't-blue', 't-mag', 't-dark'][n]}"><div class="label">${mA[k][0]}</div><div class="value">${k === 2 ? achText(mA[k][1]) : mA[k][2] === 'egp' ? egpC(mA[k][1]) : fmtInt(mA[k][1])}</div><div class="note">${esc(a.label)} · vs ${esc(b.label)}: ${k === 2 ? achPct(mB[k][1]) : mA[k][2] === 'egp' ? egpC(mB[k][1]) : fmtInt(mB[k][1])} ${chgM(mA[k][1], mB[k][1], mA[k][2])}</div></div>`).join('')}</div>`;
  h += sec(`${esc(a.label)} vs ${esc(b.label)}`, `Period A: ${ymLbl(a.s)}–${ymLbl(a.e)}${covNote(a, A1)} · Period B: ${ymLbl(b.s)}–${ymLbl(b.e)}${covNote(b, B1)}`, table(['Measure', esc(a.label), esc(b.label), 'Change'], mA.map((m, i) => [m[0], fmtM(m[1], m[2]), fmtM(mB[i][1], m[2]), chgM(m[1], mB[i][1], m[2], m[3])])));
  // branch breakdown
  const byA = C.groupBy(S, A1.idx, i => S.br[i]), byB = C.groupBy(S, B1.idx, i => S.br[i]);
  const tA = branchTargets(A1.f).by, tB = branchTargets(B1.f).by;
  const brs = [...new Set([...byA.keys(), ...byB.keys()])].sort((x, y) => branchSort(S.branches[x], S.branches[y]));
  const rows = brs.map(bi => ({ bi, name: S.branches[bi], a: byA.has(bi) ? C.summarize(S, byA.get(bi)) : null, b: byB.has(bi) ? C.summarize(S, byB.get(bi)) : null, ta: tA.get(bi), tb: tB.get(bi) }));
  h += sec('By branch', 'Revenue for each period with ROs and VTP; the arrow shows the change from B to A.', dualBars(rows.map(r => ({ label: r.name, a: r.a, b: r.b, ta: r.ta, tb: r.tb })), a.label, b.label));
  h += sec('Branch table', '', table(['Branch', `Revenue ${esc(a.label)}`, `Revenue ${esc(b.label)}`, 'Change', `Ach. ${esc(a.label)}`, `Ach. ${esc(b.label)}`, `ROs ${esc(a.label)}`, `ROs ${esc(b.label)}`, `VTP ${esc(a.label)}`, `VTP ${esc(b.label)}`, `Disc. rate ${esc(a.label)}`, `Disc. rate ${esc(b.label)}`], rows.map(r => [esc(r.name), r.a ? egp(r.a.rev) : '—', r.b ? egp(r.b.rev) : '—', r.a && r.b ? trendMark(r.a.rev, r.b.rev) : '—', r.ta && r.ta.target > 0 ? achText(r.ta.rev / r.ta.target) : '—', r.tb && r.tb.target > 0 ? achText(r.tb.rev / r.tb.target) : '—', r.a ? fmtInt(r.a.ros) : '—', r.b ? fmtInt(r.b.ros) : '—', r.a ? fmtInt(r.a.vins) : '—', r.b ? fmtInt(r.b.vins) : '—', r.a ? pct(r.a.rate) : '—', r.b ? pct(r.b.rate) : '—'])));
  // monthly overlay
  const la = []; for (let m = a.s; m <= a.e; m = C.ymAdd(m, 1)) la.push(m);
  const lb = []; for (let m = b.s; m <= b.e; m = C.ymAdd(m, 1)) lb.push(m);
  const n = Math.max(la.length, lb.length);
  if (n > 1) {
    const rev = ms => ms.map(m => { const st = cstats(m, m); return st.sm.lines ? st.sm.rev : (A.coverage.has(m) ? 0 : null); });
    const va = rev(la), vb = rev(lb);
    h += sec('Month by month', `Month 1 of A is drawn against month 1 of B, and so on.`, lineChart({ labels: Array.from({ length: n }, (_, i) => `${la[i] ? MON[la[i] % 100 - 1] : '—'} / ${lb[i] ? MON[lb[i] % 100 - 1] : '—'}`), series: [{ name: a.label, color: 'var(--blue)', values: Array.from({ length: n }, (_, i) => va[i] ?? null) }, { name: b.label, color: 'var(--grey)', values: Array.from({ length: n }, (_, i) => vb[i] ?? null) }], fmt: 'money', aria: 'Period overlay' }));
  }
  return h;
}
function dualBars(rows, la, lb) {
  if (!rows.length) return '<div class="empty"><strong>Nothing to compare</strong>No revenue in either period.</div>';
  pushBlock({ type: 'bars', labels: rows.map(r => r.label), values: rows.map(r => (r.a ? r.a.rev : 0)), series2: rows.map(r => (r.b ? r.b.rev : 0)), names: [la, lb], notes: rows.map(r => [r.label, r.a ? compact(r.a.rev) : '—', `${r.b ? lb + ': ' + compact(r.b.rev) : ''}${r.a && r.b ? ' · ' + txt(trendMark(r.a.rev, r.b.rev)) : ''}`]), fmt: 'money' });
  const max = Math.max(...rows.map(r => Math.max(r.a ? r.a.rev : 0, r.b ? r.b.rev : 0)), 1);
  const bar = (sm, t, col) => `<div class="dual"><div class="bar" style="height:11px"><i style="width:${sm ? Math.max(0, sm.rev) / max * 100 : 0}%;background:${col}"></i></div><div class="dv"><b>${sm ? egpC(sm.rev) : '—'}</b> <span class="mini">${sm ? roVtp(sm) : 'No data'}</span>${t && t.target > 0 ? ' ' + achLine(t.rev, t.target) : ''}</div></div>`;
  return rows.map(r => `<div class="duo"><div class="duo-l">${esc(r.label)}<div>${r.a && r.b ? trendMark(r.a.rev, r.b.rev) : ''}</div></div><div>${bar(r.a, r.ta, 'var(--blue)')}${bar(r.b, r.tb, 'var(--grey-l)')}</div></div>`).join('') + `<div class="legend"><span><i class="sw sq" style="background:var(--blue)"></i>${esc(la)}</span><span><i class="sw sq" style="background:var(--grey-l)"></i>${esc(lb)}</span></div>`;
}
function compareBranches() {
  const S = A.S, c = A.cmp;
  const names = [...c.branches].filter(n => S.branches.includes(n) && (!A.scopeBranches || A.scopeBranches.has(n))).sort(branchSort);
  if (names.length < 2) return '<div class="section empty"><strong>Pick at least two branches</strong>Tick the branches you want to compare.</div>';
  const st = names.map(n => ({ n, st: cstats(A.f.s, A.f.e, { branches: new Set([S.branches.indexOf(n)]) }) }));
  const ms = st.map(x => cmpMetrics(x.st));
  let h = sec(`Branches side by side — ${ymLbl(A.f.s)}${A.f.s !== A.f.e ? '–' + ymLbl(A.f.e) : ''}`, 'The best value in each row is highlighted.', table(['Measure'].concat(names.map(esc)), ms[0].map((m, r) => {
    const vals = ms.map(x => x[r][1]); const fin = vals.filter(Number.isFinite); const best = fin.length ? (m[3] ? Math.min(...fin) : Math.max(...fin)) : null;
    return [m[0]].concat(vals.map(v => `<span class="${Number.isFinite(v) && v === best && fin.length > 1 ? 'best' : ''}">${fmtM(v, m[2])}</span>`));
  })));
  const list = st.map(x => ({ label: x.n, sm: x.st.sm, target: x.st.ach.target > 0 ? x.st.ach.target : 0, color: branchColor(x.n) }));
  h += `<div class="two">${sec('Revenue and achievement', '', revRows(list.slice().sort((a, b) => b.sm.rev - a.sm.rev), { aria: 'Branch revenue' }))}${sec('Revenue per working day', '', hbars(st.slice().sort((a, b) => (b.st.revWd || 0) - (a.st.revWd || 0)).map(x => ({ label: x.n, segs: [{ v: x.st.revWd || 0, color: branchColor(x.n) }], value: `<b>${egpC(x.st.revWd)}</b>`, sub: `${egpC(x.st.revCd)} per calendar day` })), { aria: 'Revenue per working day' }))}</div>`;
  h += `<div class="two">${sec('Revenue per RO and per VTP', '', hbars(st.map(x => ({ label: x.n, segs: [{ v: x.st.sm.revPerRo || 0, color: branchColor(x.n) }], value: `<b>${egpC(x.st.sm.revPerRo)}</b>`, sub: `${egpC(x.st.sm.revPerVin)} per VTP` })), { aria: 'Revenue per RO' }))}${sec('Discount', '', hbars(st.map(x => ({ label: x.n, segs: [{ v: x.st.sm.disc, color: 'var(--c3)' }], value: `<b>${egpC(x.st.sm.disc)}</b>`, sub: `${pct(x.st.sm.rev ? x.st.sm.disc / x.st.sm.rev : NaN)} of achieved · rate ${pct(x.st.sm.rate)}` })), { aria: 'Discount' }))}</div>`;
  // monthly lines
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  if (months.length > 1) h += sec('Monthly revenue', '', lineChart({ labels: months.map(ymLbl), series: names.map(n => { const bi = S.branches.indexOf(n); const ix = C.select(S, F({ branches: new Set([bi]), act: cmpAct() })); const by = C.groupBy(S, ix, i => S.ym[i]); return { name: n, color: branchColor(n), values: months.map(m => (by.has(m) ? C.summarize(S, by.get(m)).rev : (A.coverage.has(m) ? 0 : null))) }; }), missing: months.map(m => !A.coverage.has(m)), fmt: 'money', aria: 'Monthly revenue by branch' }));
  return h;
}
function compareMonths() {
  const S = A.S, months = [...A.cmp.months].sort((a, b) => a - b);
  if (!months.length) return '<div class="section empty"><strong>Pick months</strong>Tick the months you want to compare.</div>';
  const st = months.map(m => cstats(m, m)); const ms = st.map(cmpMetrics);
  let h = sec('Selected months side by side', 'The arrow compares each month with the previous selected month.', table(['Measure'].concat(months.map(ymLbl)), ms[0].map((m, r) => [m[0]].concat(ms.map((x, k) => fmtM(x[r][1], m[2]) + (k ? `<div>${chgM(x[r][1], ms[k - 1][r][1], m[2], m[3])}</div>` : ''))))));
  h += `<div class="two">${sec('Revenue', '', revRows(months.map((m, k) => ({ label: ymLbl(m), sm: st[k].sm, target: st[k].ach.target > 0 ? st[k].ach.target : 0 })), { byStatus: true, aria: 'Revenue by month' }))}${sec('Revenue per working day', '', hbars(months.map((m, k) => ({ label: ymLbl(m), segs: [{ v: st[k].revWd || 0, color: 'var(--blue)' }], value: `<b>${egpC(st[k].revWd)}</b>`, sub: k ? trendMark(st[k].revWd, st[k - 1].revWd) : '' })), { aria: 'Revenue per working day by month' }))}</div>`;
  // branch × month matrix
  const by = months.map(m => C.groupBy(S, st[months.indexOf(m)].idx, i => S.br[i]));
  const brs = [...new Set(by.flatMap(x => [...x.keys()]))].sort((a, b) => branchSort(S.branches[a], S.branches[b]));
  const tg = st.map(x => branchTargets(x.f).by);
  h += sec('Branch × month', 'Revenue with achievement where a target exists; arrows compare with the previous selected month.', table(['Branch'].concat(months.map(ymLbl)), brs.map(bi => [esc(S.branches[bi])].concat(months.map((m, k) => { const ix = by[k].get(bi); if (!ix) return '—'; const sm = C.summarize(S, ix); const t = tg[k].get(bi); const prevIx = k ? by[k - 1].get(bi) : null; return `${egpC(sm.rev)}${t && t.target > 0 ? `<div>${achText(t.rev / t.target)}</div>` : ''}${prevIx ? `<div>${trendMark(sm.rev, C.summarize(S, prevIx).rev)}</div>` : ''}`; })))));
  return h;
}

/* ======================= page: follow-up ======================= */
/* ======================= page: cash & warranty detail ======================= */
/* EM and BS separately; under each, warranty and cash parts (every part number) and labour (every job description),
   ranked by revenue or by count (units for parts, times billed for labour) */
function cwSort() { if (!A.cwSort) { try { A.cwSort = localStorage.getItem('ps.cwSort') || 'rev'; } catch (e) { A.cwSort = 'rev'; } } return A.cwSort === 'cnt' ? 'cnt' : 'rev'; }
const isRN = code => /^RN-/i.test(String(code || ''));
/* parts per part number, with each branch's revenue and units */
function cwPartsList(act, cw) {
  const S = A.S, P = S.P; if (!P || !P.n) return null;
  const ix = C.selectParts(S, Object.assign(F(), { act, cw, exCats: [] })), m = new Map();
  for (const i of ix) { const k = P.mat[i]; let o = m.get(k); if (!o) { o = { m: k, net: 0, qty: 0, ros: 0, lines: 0, disc: 0, cat: P.cat[i], br: new Map() }; m.set(k, o); } o.net += P.net[i]; o.qty += P.qty[i]; o.ros += P.ros[i]; o.lines += P.lines[i]; o.disc += P.disc[i];
    const b = P.br[i]; let y = o.br.get(b); if (!y) { y = { net: 0, cnt: 0 }; o.br.set(b, y); } y.net += P.net[i]; y.cnt += P.qty[i]; }
  return [...m.values()].filter(o => o.net || o.qty);
}
/* labour per job description (all four EM/BS × cash/warranty groups in one pass), with each branch's revenue and times billed */
function cwLabourAll() {
  const S = A.S, O = S.O; if (!O || !O.n || !S.opsLoaded) return null;
  const f = F(), key = JSON.stringify([f.s, f.e, f.branches ? [...f.branches] : null, f.noOW, S.n, O.n]);
  if (A._cwLab && A._cwLab.key === key && A._cwLab.S === S) return A._cwLab.res;
  const combo = new Uint8Array(S.n).fill(255); // 0 EM cash, 1 EM warranty, 2 BS cash, 3 BS warranty
  for (const act of [0, 1]) for (const cw of [0, 1]) for (const i of C.select(S, Object.assign(F(), { act, cw }))) combo[i] = act * 2 + cw;
  const maps = [new Map(), new Map(), new Map(), new Map()], ROW = O.row, JOB = O.job, NL = O.netL, HR = O.hrs, RO = S.ro, BR = S.br;
  for (let o = 0; o < O.n; o++) { const r = ROW[o], c = combo[r]; if (c === 255) continue; const l = NL[o], h = HR[o]; if (!l && !h) continue; const m = maps[c], k = JOB[o]; let x = m.get(k); if (!x) { x = { j: k, net: 0, n: 0, hrs: 0, ros: new Set(), br: new Map() }; m.set(k, x); } x.net += l; x.n++; x.hrs += h || 0; x.ros.add(RO[r]);
    const b = BR[r]; let y = x.br.get(b); if (!y) { y = { net: 0, cnt: 0 }; x.br.set(b, y); } y.net += l; y.cnt++; }
  const res = maps.map(m => [...m.values()].map(x => ({ j: x.j, net: x.net, n: x.n, hrs: x.hrs, ros: x.ros.size, br: x.br })));
  A._cwLab = { key, S, res }; return res;
}
function cwLabourList(act, cw) { const all = cwLabourAll(); return all ? all[act * 2 + cw].slice() : null; }
/* kind: 'parts' = RN- part numbers · 'other' = every other part number · 'labour' = job descriptions */
function cwSorted(kind, act, cw) {
  const sortBy = cwSort();
  if (kind === 'labour') { const l = cwLabourList(act, cw); if (l) l.sort((a, b) => (sortBy === 'cnt' ? b.n - a.n || b.net - a.net : b.net - a.net || b.n - a.n)); return l; }
  let l = cwPartsList(act, cw); if (!l) return null;
  const S = A.S; l = l.filter(o => (kind === 'parts') === isRN(S.mats[o.m]));
  l.sort((a, b) => (sortBy === 'cnt' ? b.qty - a.qty || b.net - a.net : b.net - a.net || b.qty - a.qty)); return l;
}
/* long tables: drawn on screen only when opened; the PowerPoint/PDF gets the first rows, built only when exported */
function lazyTable(head, rowsFn, opts, summary, spec, total, exN, fullFn) {
  exN = exN || 50; let ex = null;
  pushBlock({ type: 'table', head: head.map(txt), get fullHead() { return fullFn ? fullFn().head : null; }, get full() { if (fullFn) return fullFn().rows; return rowsFn(0).map(r => (r.cells || r).map(txt)); }, get rows() { if (!ex) { const rows = rowsFn(exN); ex = rows.map(r => { const a = (r.cells || r).map(txt); if (r._cls === 'total') a._total = true; return a; }); if (total > exN) { const more = head.map(() => ''); more[more.length > 1 ? 1 : 0] = `… ${total - exN} more rows in the studio`; ex.push(more); } } return ex; } });
  return `<details class="box" data-lazyt="${spec}"><summary>${summary}</summary><div class="lazyt-body mini">Opening…</div></details>`;
}
function lazyTableFill(d) {
  const b = d.querySelector('.lazyt-body'); if (!b || b.dataset.done) return;
  const [kind, act, cw, view] = d.dataset.lazyt.split('|'); const t = kind === 'pbr' ? (view === 'rn' ? partsRnTopTable() : partsBrTable()) : view === 'br' ? cwBranchTable(kind, +act, +cw) : cwTable(kind, +act, +cw); if (!t) return;
  const keep = NUM.pending; NUM.pending = []; b.outerHTML = `<div class="lazyt-body" data-done="1">${table(t.head, t.rows, t.opts)}</div>`; NUM.pending = keep;
}
if (typeof document !== 'undefined') document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.lazyt && d.open) lazyTableFill(d); }, true);
function cwTable(kind, act, cw, l, limit) {
  const S = A.S; l = l || cwSorted(kind, act, cw); if (!l) return null;
  const all = l; if (limit) l = l.slice(0, limit);
  const tot = all.reduce((a, o) => a + o.net, 0);
  if (kind !== 'labour') return { head: ['#', 'Part number', 'Name', 'Category', 'Revenue', 'Share', 'Units', 'ROs', 'Avg price'], opts: { align: ['num', '', '', '', 'num', 'num', 'num', 'num', 'num'], maxH: 520 },
    rows: l.map((o, k) => [String(k + 1), esc(S.mats[o.m]), esc(partName(S.mats[o.m])), esc(catName(S, o.cat)), egp(o.net), pct(tot ? o.net / tot : NaN), fmtInt(o.qty), fmtInt(o.ros), egpC(o.qty ? o.net / o.qty : NaN)]) };
  return { head: ['#', 'Job description', 'Labour revenue', 'Share', 'Times billed', 'ROs', 'Hours', 'Avg per job'], opts: { align: ['num', '', 'num', 'num', 'num', 'num', 'num', 'num'], maxH: 520 },
    rows: l.map((o, k) => [String(k + 1), esc(S.opJobs[o.j]), egp(o.net), pct(tot ? o.net / tot : NaN), fmtInt(o.n), fmtInt(o.ros), fmtNum1(o.hrs), egpC(o.n ? o.net / o.n : NaN)]) };
}
/* the same list split by branch: one column per branch (revenue or count, following the sort), first row = all items */
function cwBranchTable(kind, act, cw, l, limit) {
  const S = A.S; l = l || cwSorted(kind, act, cw); if (!l) return null;
  const cnt = cwSort() === 'cnt', top = limit === 0 ? l : l.slice(0, limit || 30);
  const tot = new Map(); for (const o of l) for (const [b, y] of o.br) { const t = tot.get(b) || { net: 0, cnt: 0 }; t.net += y.net; t.cnt += y.cnt; tot.set(b, t); }
  const brs = [...tot.keys()].sort((a, b) => { const ia = BRANCH_ORDER.indexOf(S.branches[a]), ib = BRANCH_ORDER.indexOf(S.branches[b]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  const v = y => (!y ? '—' : cnt ? fmtInt(y.cnt) : egpC(y.net));
  const name = o => (kind === 'labour' ? esc(S.opJobs[o.j]) : `<span style="white-space:nowrap">${esc(S.mats[o.m])}</span>` + (partName(S.mats[o.m]) ? ` <span class="mini">${esc(partName(S.mats[o.m]))}</span>` : ''));
  const all = { net: l.reduce((a, o) => a + o.net, 0), cnt: l.reduce((a, o) => a + (kind === 'labour' ? o.n : o.qty), 0) };
  const rows = [Object.assign([`<b>All ${kind === 'labour' ? 'job descriptions' : 'part numbers'} (${fmtInt(l.length)})</b>`].concat(brs.map(b => `<b>${v(tot.get(b))}</b>`), [`<b>${v(all)}</b>`]), { _cls: 'total' })]
    .concat(top.map((o, k) => [`<span style="white-space:nowrap">${k + 1}.</span> ${name(o)}`].concat(brs.map(b => v(o.br.get(b))), [`<b>${v({ net: o.net, cnt: kind === 'labour' ? o.n : o.qty })}</b>`])));
  return { head: [kind === 'labour' ? 'Job description' : 'Part number'].concat(brs.map(b => esc(S.branches[b])), ['Total']), rows, opts: { align: [''].concat(brs.map(() => 'num'), ['num']), maxH: 560 } };
}
function cwSection(kind, act, cw) {
  const S = A.S, sortBy = cwSort(), actN = act === 0 ? 'EM' : 'BS', cwN = cw === 0 ? 'cash' : 'warranty', col = cw === 0 ? 'var(--c4)' : 'var(--c5)';
  const l = cwSorted(kind, act, cw);
  const what = kind === 'labour' ? 'labour' : kind === 'parts' ? 'parts (RN- part numbers)' : 'parts — other part numbers (not RN-)';
  if (!l) return sec(`${actN} — ${cwN} ${what}`, '', `<div class="empty"><strong>No ${kind === 'labour' ? 'job descriptions' : 'parts lines'}</strong>Re-import the transaction files with V2.</div>`);
  const brSpec = `${kind}|${act}|${cw}|br`, listSpec = `${kind}|${act}|${cw}|list`;
  const brTbl = () => { const brT = cwBranchTable(kind, act, cw, l, 1); return lazyTable(brT.head, n => cwBranchTable(kind, act, cw, l, n).rows, brT.opts, `Show by branch — top 30, ${sortBy === 'cnt' ? (kind === 'labour' ? 'times billed' : 'units') : 'revenue'} in each branch`, brSpec, 31, 31); };
  if (kind === 'other') {
    const tot = l.reduce((a, o) => a + o.net, 0), totQ = l.reduce((a, o) => a + o.qty, 0);
    const t = cwTable('other', act, cw, l, 1), tbl = lazyTable(t.head, n => cwTable('other', act, cw, l, n).rows, t.opts, `Show the table — all ${fmtInt(l.length)} part numbers`, listSpec, l.length);
    return sec(`${actN} — ${cwN} parts, other part numbers (not RN-)`, `${fmtInt(l.length)} part numbers · ${egpC(tot)} · ${fmtInt(totQ)} units (LO-, LOR-, CL-, codes without a prefix and similar), ${sortBy === 'cnt' ? 'by units sold' : 'by revenue'}.`, tbl + brTbl());
  }
  if (kind === 'parts') {
    const tot = l.reduce((a, o) => a + o.net, 0), totQ = l.reduce((a, o) => a + o.qty, 0);
    const nm = o => S.mats[o.m] + (partName(S.mats[o.m]) ? ' · ' + partName(S.mats[o.m]) : '');
    const chart = hbars(l.slice(0, 15).map((o, k) => ({ label: `${k + 1}. ${nm(o)}`, segs: [{ v: sortBy === 'cnt' ? o.qty : o.net, color: col }], value: sortBy === 'cnt' ? `<b>${fmtInt(o.qty)} units</b>` : `<b>${egpC(o.net)}</b>`, sub: sortBy === 'cnt' ? `${egpC(o.net)} · ${fmtInt(o.ros)} ROs` : `${fmtInt(o.qty)} units · ${fmtInt(o.ros)} ROs · ${pct(tot ? o.net / tot : NaN)} of RN- ${cwN} parts` })), { wide: true, aria: `${actN} ${cwN} parts`, fmt: sortBy === 'cnt' ? 'int' : undefined, emptyText: `No ${actN} ${cwN} RN- parts for these filters.` });
    const t = cwTable('parts', act, cw, l, 1), tbl = lazyTable(t.head, n => cwTable('parts', act, cw, l, n).rows, t.opts, `Show the table — all ${fmtInt(l.length)} RN- part numbers`, listSpec, l.length);
    return sec(`${actN} — ${cwN} parts, ${sortBy === 'cnt' ? 'by units sold' : 'by revenue'}`, `RN- part numbers only: ${fmtInt(l.length)} part numbers · ${egpC(tot)} · ${fmtInt(totQ)} units. Other part numbers are listed at the end of this tab. The chart shows the top 15.`, chart + tbl + brTbl());
  }
  const tot = l.reduce((a, o) => a + o.net, 0), totN = l.reduce((a, o) => a + o.n, 0);
  const chart = hbars(l.slice(0, 15).map((o, k) => ({ label: `${k + 1}. ${esc(S.opJobs[o.j])}`, segs: [{ v: sortBy === 'cnt' ? o.n : o.net, color: col }], value: sortBy === 'cnt' ? `<b>${fmtInt(o.n)} times</b>` : `<b>${egpC(o.net)}</b>`, sub: sortBy === 'cnt' ? `${egpC(o.net)} · ${fmtNum1(o.hrs)} h` : `${fmtInt(o.n)} times · ${fmtNum1(o.hrs)} h · ${pct(tot ? o.net / tot : NaN)} of ${cwN} labour` })), { wide: true, aria: `${actN} ${cwN} labour`, fmt: sortBy === 'cnt' ? 'int' : undefined, emptyText: `No ${actN} ${cwN} labour for these filters.` });
  const t = cwTable('labour', act, cw, l, 1), tbl = lazyTable(t.head, n => cwTable('labour', act, cw, l, n).rows, t.opts, `Show the table — all ${fmtInt(l.length)} job descriptions`, listSpec, l.length);
  return sec(`${actN} — ${cwN} labour, ${sortBy === 'cnt' ? 'by times billed' : 'by revenue'}`, `${fmtInt(l.length)} job descriptions · ${egpC(tot)} labour · billed ${fmtInt(totN)} times. The chart shows the top 15.`, chart + tbl + brTbl());
}
const fmtNum1 = n => { if (!Number.isFinite(n)) return 'N/A'; const r = Math.round(Math.abs(n) * 10), i = Math.floor(r / 10), d = r % 10; return (n < 0 && r ? '-' : '') + groupInt(i) + (d ? '.' + d : ''); };
/* ======================= page: Focus ======================= */
/* RN- parts of one activity and payer, sorted by revenue ('rev') or units sold ('cnt') */
function focusParts(act, cw, by) {
  const l = cwPartsList(act, cw); if (!l) return null; const S = A.S;
  return l.filter(o => isRN(S.mats[o.m])).sort((a, b) => (by === 'cnt' ? b.qty - a.qty || b.net - a.net : b.net - a.net || b.qty - a.qty));
}
function pageFocus() {
  const S = A.S; let h = extKeyFigures();
  if (!S.P || !S.P.n) return h + '<div class="section empty"><strong>No parts lines</strong>Re-import the transaction files with V2 for the top-parts charts.</div>';
  const COMBOS = []; for (const act of [0, 1]) for (const cw of [1, 0]) for (const by of ['rev', 'cnt']) COMBOS.push({ act, cw, by });
  const lists = new Map(); const listOf = c => { const k = `${c.act}${c.cw}${c.by}`; if (!lists.has(k)) lists.set(k, focusParts(c.act, c.cw, c.by) || []); return lists.get(k); };
  const nm = c => `${c.act === 0 ? 'EM' : 'BS'} — ${c.cw === 0 ? 'cash' : 'warranty'} parts, ${c.by === 'cnt' ? 'by units sold' : 'by revenue'}`;
  const pn = o => S.mats[o.m] + (partName(S.mats[o.m]) ? ' · ' + partName(S.mats[o.m]) : '');
  // top 30 charts: revenue and units side by side for each activity and payer
  for (let k = 0; k < COMBOS.length; k += 2) {
    h += '<div class="two">' + [COMBOS[k], COMBOS[k + 1]].map((c, j) => {
      const tk = `focus${k + j}`, nTop = modelTop()[tk], l = listOf(c), shown = nTop ? l.slice(0, nTop) : l, tot = l.reduce((a, o) => a + o.net, 0), totQ = l.reduce((a, o) => a + o.qty, 0), col = c.cw === 0 ? 'var(--c4)' : 'var(--c5)';
      const chart = hbars(shown.map((o, i) => ({ label: `${i + 1}. ${pn(o)}`, segs: [{ v: c.by === 'cnt' ? o.qty : o.net, color: col }], value: c.by === 'cnt' ? `<b>${fmtInt(o.qty)} units</b>` : `<b>${egpC(o.net)}</b>`, sub: c.by === 'cnt' ? `${egpC(o.net)} · ${fmtInt(o.ros)} ROs` : `${fmtInt(o.qty)} units · ${pct(tot ? o.net / tot : NaN)} of the total` })), { wide: true, aria: nm(c), fmt: c.by === 'cnt' ? 'int' : undefined, emptyText: 'No RN- parts for these filters.' });
      return sec(`${nm(c)} — ${nTop ? 'top ' + Math.min(nTop, l.length) : 'all ' + fmtInt(l.length)}`, `RN- part numbers, sorted from the highest ${c.by === 'cnt' ? 'units sold' : 'revenue'}: ${fmtInt(l.length)} part numbers · ${egpC(tot)} · ${fmtInt(totQ)} units.`, nTop ? chart : `<div class="scrollbox">${chart}</div>`, modelTopSel(tk, l.length));
    }).join('') + '</div>';
  }
  // the same, ranked inside each branch: one table per branch
  for (const [ci, c] of COMBOS.entries()) {
    const tk = `focusBr${ci}`, nTop = modelTop()[tk], l = listOf(c), byBr = new Map();
    for (const o of l) for (const [b, y] of o.br) { let a = byBr.get(b); if (!a) { a = []; byBr.set(b, a); } a.push({ o, net: y.net, cnt: y.cnt }); }
    const brs = [...byBr.keys()].sort((a, b) => branchSort(S.branches[a], S.branches[b]));
    const body = brs.length ? `<div class="cardgrid focusgrid">${brs.map(b => { const all = byBr.get(b).sort((x, y) => (c.by === 'cnt' ? y.cnt - x.cnt || y.net - x.net : y.net - x.net || y.cnt - x.cnt)), top = nTop ? all.slice(0, nTop) : all, tN = all.reduce((a, x) => a + x.net, 0), tQ = all.reduce((a, x) => a + x.cnt, 0);
      const rows = top.map((x, i) => [String(i + 1), `<span style="white-space:nowrap">${esc(S.mats[x.o.m])}</span>${partName(S.mats[x.o.m]) ? `<div class="mini">${esc(partName(S.mats[x.o.m]))}</div>` : ''}`, c.by === 'cnt' ? `<b>${fmtInt(x.cnt)}</b>` : `<b>${egpC(x.net)}</b>`, c.by === 'cnt' ? egpC(x.net) : fmtInt(x.cnt)]);
      return miniCard(esc(S.branches[b]), table(['#', 'Part number', c.by === 'cnt' ? 'Units' : 'Revenue', c.by === 'cnt' ? 'Revenue' : 'Units'], rows, { align: ['', '', 'num', 'num'] }), `<div class="mcard-v"><b>${c.by === 'cnt' ? fmtInt(tQ) + ' units' : egpC(tN)}</b><span class="mini">${fmtInt(all.length)} part numbers</span></div>`); }).join('')}</div>` : '<div class="empty"><strong>Nothing to show</strong>No RN- parts for these filters.</div>';
    h += sec(`${nm(c)} — ${nTop ? 'top ' + nTop : 'all'} in each branch`, `For every branch, its own ${nTop ? nTop : 'every'} RN- part number${nTop === 1 ? '' : 's'} with the highest ${c.by === 'cnt' ? 'units sold' : 'revenue'}, one table per branch.`, nTop ? body : body.replace('<div class="cardgrid focusgrid">', '<div class="cardgrid focusgrid focusall">'), modelTopSel(tk, 0));
  }
  // the part-number table, the same as 9.23 on the Parts tab (same search, ticks and Excel)
  { const P = S.P, ix = C.selectParts(S, Object.assign(F(), { exCats: [...partsEx()] })), byMat = new Map(); for (const i of ix) { const k = P.mat[i]; let a = byMat.get(k); if (!a) { a = []; byMat.set(k, a); } a.push(i); }
    const mats = [...byMat].map(([m, l]) => { let cash = 0, war = 0; for (const i of l) { if (P.cw[i] === 0) cash += P.net[i]; else if (P.cw[i] === 1) war += P.net[i]; } return { code: S.mats[m], m, s2: C.sumParts(S, l), cat: P.cat[l[0]], cash, war }; }).sort((a, b) => b.s2.net - a.s2.net);
    h += partNumbersSec(mats); A._partsCsv = A.partSelOnly && partSel().size ? mats.filter(x => partSel().has(x.code)) : mats; }
  return h;
}
/* ======================= page: history (month × year tables) ======================= */
// one pass over the data: revenue by month × unit, split into total, parts, labour, other, cash and warranty (cached per branch filter)
let histCache = { S: null, key: '', v: null };
function histBase() {
  const S = A.S, f0 = F(), key = JSON.stringify([f0.branches ? [...f0.branches] : null, !!f0.noOW]);
  if (histCache.S === S && histCache.key === key) return histCache.v;
  const mu = new Map(), bm = f0.branches;
  for (let i = 0; i < S.n; i++) {
    if (bm && !bm.has(S.br[i])) continue; if (f0.noOW && S.ow[i]) continue;
    const k = S.ym[i] * 1000 + S.unit[i]; let o = mu.get(k); if (!o) { o = [0, 0, 0, 0, 0, 0]; mu.set(k, o); }
    o[0] += S.net[i]; o[1] += S.netP[i]; o[2] += S.netL[i]; o[3] += S.netO[i]; if (S.cw[i] === 1) o[5] += S.net[i]; else o[4] += S.net[i];
  }
  const v = { mu, f0 }; histCache = { S, key, v }; return v;
}
function histYears() {
  const T = A.T, tYms = T ? [...T.byMonth.keys()] : [], cov = [...A.coverage];
  const allYms = cov.concat(tYms, tYms.map(m => m - 100)).filter(m => m > 200000);
  if (!allYms.length) return null;
  const lastYm = Math.max(...cov.concat(tYms)), y0 = Math.max(2022, Math.floor(Math.min(...allYms) / 100)), y1 = Math.floor(lastYm / 100);
  const years = []; for (let y = y0; y <= y1; y++) years.push(y);
  return { years, lastYm, y0 };
}
// m = { comp: 0 total | 1 parts | 2 labour | 3 other | [2,3] labour + other | 4 cash | 5 warranty, scopes: ['EM','BS'], tb: budget keys, ta: actual keys in the target file }
function histCell(m, ym) {
  const S = A.S, T = A.T, { mu, f0 } = histBase(), t = T && T.byMonth.get(ym);
  const comps = Array.isArray(m.comp) ? m.comp : [m.comp];
  const uOk = ui => (!f0.branches || f0.branches.has(S.unitBranch[ui])) && m.scopes.includes(S.unitScope[ui]);
  let ach = 0, target = 0, any = false, src = '';
  if (A.coverage.has(ym)) {
    for (let ui = 0; ui < S.units.length; ui++) {
      if (!uOk(ui)) continue; const o = mu.get(ym * 1000 + ui); const v = o ? comps.reduce((a, c) => a + o[c], 0) : 0;
      if (m.tb) { const tu = t && t.units.get(S.units[ui]); const b = tu ? m.tb.reduce((a, k) => a + (tu[k] || 0), 0) : 0; if (b > 0) { target += b; ach += v; } else if (!t) ach += v; }
      else ach += v;
      any = true;
    }
    src = 'data';
  } else if (m.ta) {
    if (t) for (const [u, tu] of t.units) { const ui = S.units.indexOf(u); if (ui < 0 || !uOk(ui)) continue; target += m.tb ? m.tb.reduce((a, k) => a + (tu[k] || 0), 0) : 0; const a = m.ta.reduce((x, k) => x + (tu[k] || 0), 0); if (a > 0) { ach += a; any = true; } }
    const tn = T && T.byMonth.get(ym + 100);
    if (!any && m.prior && tn) for (const [u, tu] of tn.units) { const ui = S.units.indexOf(u); if (ui < 0 || !uOk(ui)) continue; if (tu.prior > 0) { ach += tu.prior; any = true; src = 'prior'; } }
    if (any && !src) src = 'target file';
  }
  return { ach: any ? ach : NaN, target: target > 0 ? target : NaN, src };
}
const HIST_GK = n => Array.from({ length: n }, (_, k) => ['fy', 'y2', 'ly', 'cur'][Math.max(0, 4 - n + k)] || 'cur');
// a month × year table: with a target → achieved / target / % per year; without → value / change against the year before
function histTable(title, desc, years, lastYm, getter, opt) {
  opt = opt || {}; const withT = !!opt.target, fm = opt.fmt || (v => egpC(v)), fx = opt.fx || (v => Math.round(v));
  const dash = '<span class="mini">—</span>', money = v => (Number.isFinite(v) && v ? fm(v) : dash);
  let grid = years.map(y => MON.map((_, i) => (y * 100 + i + 1 > lastYm ? null : getter(y * 100 + i + 1))));
  // a year with nothing in it (no data and no target) is left out of this table
  const keepY = years.map((y, k) => grid[k].some(c => c && (Number.isFinite(c.ach) || c.target > 0)));
  if (keepY.some(Boolean)) { years = years.filter((y, k) => keepY[k]); grid = grid.filter((g, k) => keepY[k]); }
  const pc = v => (Number.isFinite(v) ? `<span class="delta ${v >= 1 ? 'up' : 'down'}">${pct(v)}</span>` : dash);
  const ch = (a, b) => { const d = chg(a, b); return Number.isFinite(d) && b ? deltaChip(d, opt.invert) : dash; };
  const tot = years.map((y, k) => { let a = 0, t = 0, aT = 0, n = 0; for (const c of grid[k]) { if (!c) continue; if (Number.isFinite(c.ach)) { a += c.ach; n++; } if (c.target > 0) { t += c.target; if (Number.isFinite(c.ach)) aT += c.ach; } } return { a: n ? a : NaN, t, p: t ? aT / t : NaN, n }; });
  // the year-before total over the same months, so a part year compares fairly
  const totPrev = years.map((y, k) => { if (!k) return NaN; let a = 0, n = 0; grid[k].forEach((c, i) => { const pv = grid[k - 1][i]; if (c && Number.isFinite(c.ach) && pv && Number.isFinite(pv.ach)) { a += pv.ach; n++; } }); return n ? a : NaN; });
  const totCur = years.map((y, k) => { if (!k) return NaN; let a = 0, n = 0; grid[k].forEach((c, i) => { const pv = grid[k - 1][i]; if (c && Number.isFinite(c.ach) && pv && Number.isFinite(pv.ach)) { a += c.ach; n++; } }); return n ? a : NaN; });
  let head, rows, full;
  if (withT) {
    head = ['Month'].concat(years.flatMap(y => [`${y} achieved`, `${y} target`, `${y} %`]));
    // opt.yoy: under each achieved / target value, the change against the same month of the year before
    const yo = (v, b) => { if (!opt.yoy) return ''; const d = chg(v, b); return `<div style="margin-top:2px;font-size:11px">${Number.isFinite(v) && v && Number.isFinite(d) && b ? deltaChip(d) : '<span class="mini">vs LY —</span>'}</div>`; };
    const prevA = (k, i) => { const pv = k ? grid[k - 1][i] : null, c = grid[k][i]; return pv && Number.isFinite(pv.ach) ? pv.ach : (c && Number.isFinite(c.prevAch) ? c.prevAch : NaN); };
    const prevT = (k, i) => { const pv = k ? grid[k - 1][i] : null; return pv && pv.target > 0 ? pv.target : NaN; };
    rows = MON.map((mn, i) => [`<b>${FMON[i]}</b>`].concat(years.flatMap((y, k) => { const c = grid[k][i]; return c ? [money(c.ach) + (Number.isFinite(c.ach) ? yo(c.ach, prevA(k, i)) : ''), money(c.target) + (c.target > 0 ? yo(c.target, prevT(k, i)) : ''), pc(Number.isFinite(c.ach) && c.target > 0 ? c.ach / c.target : NaN)] : ['', '', '']; })));
    // totals: compare only the months that have a value in both years
    const totYo = years.map((y, k) => { let a = 0, pa = 0, t = 0, pt = 0; grid[k].forEach((c, i) => { if (!c) return; const p1 = prevA(k, i), p2 = prevT(k, i); if (Number.isFinite(c.ach) && Number.isFinite(p1)) { a += c.ach; pa += p1; } if (c.target > 0 && Number.isFinite(p2)) { t += c.target; pt += p2; } }); return { a, pa, t, pt }; });
    rows.push({ _cls: 'total', cells: ['<b>Total</b>'].concat(tot.flatMap((x, k) => [money(x.a) + (opt.yoy && Number.isFinite(x.a) ? yo(totYo[k].a, totYo[k].pa) : ''), money(x.t) + (opt.yoy && x.t > 0 ? yo(totYo[k].t, totYo[k].pt) : ''), pc(x.p)])) });
    full = () => MON.map((mn, i) => [FMON[i]].concat(years.flatMap((y, k) => { const c = grid[k][i]; if (!c) return ['', '', '']; const p = Number.isFinite(c.ach) && c.target > 0 ? c.ach / c.target : NaN; return [Number.isFinite(c.ach) ? fx(c.ach) : '', c.target > 0 ? fx(c.target) : '', Number.isFinite(p) ? { pct: p, good: p >= 1 } : '']; }))).concat([Object.assign(['Total'].concat(tot.flatMap(x => [Number.isFinite(x.a) ? fx(x.a) : '', x.t ? fx(x.t) : '', Number.isFinite(x.p) ? { pct: x.p, good: x.p >= 1 } : ''])), { _total: true })]);
  } else {
    head = ['Month'].concat(years.flatMap((y, k) => (k ? [`${y}`, `${y} vs ${y - 1}`] : [`${y}`])));
    rows = MON.map((mn, i) => [`<b>${FMON[i]}</b>`].concat(years.flatMap((y, k) => { const c = grid[k][i], pv = k ? grid[k - 1][i] : null; if (!c) return k ? ['', ''] : ['']; return k ? [money(c.ach), ch(c.ach, pv && pv.ach)] : [money(c.ach)]; })));
    rows.push({ _cls: 'total', cells: ['<b>Total</b>'].concat(tot.flatMap((x, k) => (k ? [money(x.a), ch(totCur[k], totPrev[k])] : [money(x.a)]))) });
    const xc = (a, b) => { const d = chg(a, b); return Number.isFinite(d) && b ? { pct: d, signed: true, good: opt.invert ? d < 0 : d > 0 } : ''; };
    full = () => MON.map((mn, i) => [FMON[i]].concat(years.flatMap((y, k) => { const c = grid[k][i], pv = k ? grid[k - 1][i] : null; if (!c) return k ? ['', ''] : ['']; const v = Number.isFinite(c.ach) ? fx(c.ach) : ''; return k ? [v, xc(c.ach, pv && pv.ach)] : [v]; }))).concat([Object.assign(['Total'].concat(tot.flatMap((x, k) => { const v = Number.isFinite(x.a) ? fx(x.a) : ''; return k ? [v, xc(totCur[k], totPrev[k])] : [v]; })), { _total: true })]);
  }
  const gk = HIST_GK(years.length), per = withT ? 3 : 2;
  const groups = ['id'].concat(years.flatMap((y, k) => Array(withT ? 3 : (k ? 2 : 1)).fill(gk[k])));
  const bands = { id: '' }; years.forEach((y, k) => { bands[gk[k]] = String(y); });
  return sec(title, desc, table(head, rows, { align: [''].concat(head.slice(1).map(() => 'num')), fullHead: () => head, fullFn: full, xlGroups: groups, xlBands: bands }));
}
/* 18.1: the filter's months (one month by default) in every year from 2022, with the change against the year before and the year after */
function histPeriodVals(s0, e0) {
  const S = A.S, T = A.T, f0 = F();
  const v = { target: NaN, rev: NaN, parts: NaN, labour: NaN, other: NaN, lo: NaN, labRate: NaN, cashRate: NaN, warRate: NaN, oilT: NaN, oilP: NaN, vtp: NaN, ro: NaN, pdi: NaN, rep: NaN };
  const months = []; for (let m = s0; m <= e0; m = C.ymAdd(m, 1)) months.push(m);
  const covered = months.every(m => A.coverage.has(m)), hasT = months.every(m => T && T.byMonth.get(m));
  const st = stats(s0, e0);
  if (hasT && Number.isFinite(st.ach.target) && st.ach.target > 0) v.target = st.ach.target;
  if (!covered) {
    // before the transaction data: revenue from the target files' actual (or the next year's “last year” column)
    const ok = u => { const ui = S.units.indexOf(u); return ui >= 0 && (!f0.branches || f0.branches.has(S.unitBranch[ui])); };
    let a = 0, pa = 0, la = 0, oa = 0, all = true;
    for (const m of months) { const t = T && T.byMonth.get(m), tn = T && T.byMonth.get(m + 100); let ma = 0;
      if (t) for (const [u, tu] of t.units) if (ok(u)) { ma += tu.actual || 0; pa += tu.parA || 0; la += tu.labA || 0; oa += tu.othA || 0; }
      if (!(ma > 0) && tn) for (const [u, tu] of tn.units) if (ok(u)) ma += tu.prior || 0;
      if (ma > 0) a += ma; else all = false; }
    if (all && a > 0) { v.rev = a; if (pa > 0) v.parts = pa; if (la > 0) v.labour = la; if (oa > 0) v.other = oa; if (la + oa > 0) v.lo = la + oa; }
    return v;
  }
  const sm = st.sm; Object.assign(v, { rev: sm.rev, parts: sm.parts, labour: sm.labour, other: sm.other, lo: sm.labour + sm.other, vtp: sm.vins, ro: sm.ros, pdi: sm.pdiVins });
  const oc = oilCalc(F({ s: s0, e: e0 })).tot; v.oilT = oc.kg / 1000; v.oilP = oc.l > 0 ? oc.net / oc.l : NaN;
  // labour rate = labour revenue ÷ billed hours; warranty rate = the same on warranty lines only
  v.labRate = sm.labourRate;
  { let wl = 0, wh = 0, cl = 0, ch = 0; for (const i of st.idx) { if (S.cw[i] === 1) { wl += S.netL[i]; wh += S.hours[i]; } else { cl += S.netL[i]; ch += S.hours[i]; } } v.warRate = wh > 0 ? wl / wh : NaN; v.cashRate = ch > 0 ? cl / ch : NaN; }
  // vehicles of the period that also came in the 12 months before it
  const p0 = C.ymAdd(s0, -12), p1 = C.ymAdd(s0, -1);
  if (A.coverage.has(p0) && A.coverage.has(p1)) { const prev = new Set(); for (const i of C.select(S, F({ s: p0, e: p1 }))) prev.add(S.vin[i]); const cur = new Set(); for (const i of st.idx) cur.add(S.vin[i]); let n = 0; for (const x of cur) if (x >= 0 && prev.has(x)) n++; v.rep = n; }
  return v;
}
function histYearSec() {
  const H = histYears(); if (!H) return '';
  // full years Jan–Dec from 2022; the latest year to date (Jan to the latest month with data)
  const lastCov = Math.max(...A.coverage), y1 = Math.floor(lastCov / 100), lm = lastCov % 100, ytd = lm < 12;
  const years = []; for (let y = 2022; y <= y1; y++) years.push(y);
  const per = y => (y === y1 ? { s: y * 100 + 1, e: lastCov } : { s: y * 100 + 1, e: y * 100 + 12 });
  const lbl = y => (y === y1 && ytd ? `${y} YTD (Jan–${MON[lm - 1]})` : `${y}`);
  const vals = new Map(years.map(y => { const p = per(y); return [y, histPeriodVals(p.s, p.e)]; }));
  // the year before the latest, over the same months, so the latest year to date compares fairly
  const prevSame = ytd && y1 - 1 >= 2022 ? histPeriodVals((y1 - 1) * 100 + 1, (y1 - 1) * 100 + lm) : null;
  const ROWS = [['Target', 'target', egpC], ['Revenue', 'rev', egpC], ['Parts', 'parts', egpC], ['Labour', 'labour', egpC], ['Other', 'other', egpC], ['Labour + other', 'lo', egpC],
    ['Labour rate (EGP per billed hour)', 'labRate', v => egp(v)], ['Cash labour rate (EGP per billed hour)', 'cashRate', v => egp(v)], ['Warranty labour rate (EGP per billed hour)', 'warRate', v => egp(v)],
    ['Oil consumed (tonnes)', 'oilT', v => `${fmtNum1(v)} t`], ['Oil price (EGP per litre)', 'oilP', v => egp(v)], ['VTP (vehicles)', 'vtp', fmtInt], ['Repair orders', 'ro', fmtInt], ['PDI vehicles', 'pdi', fmtInt], ['Repeat vehicles from the previous year', 'rep', fmtInt]];
  const dash = '<span class="mini">—</span>', chip = d => (Number.isFinite(d) ? deltaChip(d) : '<span class="delta flat">n/a</span>');
  const g = (y, key) => { const c = vals.get(y); return c && Number.isFinite(c[key]) ? c[key] : NaN; };
  const gs = key => (prevSame && Number.isFinite(prevSame[key]) ? prevSame[key] : NaN);
  // change from year a to year b; into the latest year to date it uses the same months of the year before
  const step = (a, b, key) => { const va = b === y1 && ytd ? gs(key) : g(a, key), vb = g(b, key); return Number.isFinite(va) && va && Number.isFinite(vb) ? vb / va - 1 : NaN; };
  const cell = (y, key, fm) => {
    const v = g(y, key); if (!Number.isFinite(v)) return dash;
    return `<div style="white-space:nowrap">${chip(step(y - 1, y, key))} <b>${fm(v)}</b></div>`;
  };
  const head = ['Figure'].concat(years.map(lbl));
  const rows = ROWS.map(([lb, key, fm]) => [`<b>${lb}</b>`].concat(years.map(y => cell(y, key, fm))));
  const full = () => ROWS.map(([lb, key]) => [lb].concat(years.map(y => { const v = g(y, key); return Number.isFinite(v) ? (key === 'oilT' || key === 'labRate' || key === 'cashRate' || key === 'warRate' || key === 'oilP' ? Math.round(v * 10) / 10 : Math.round(v)) : ''; })));
  return sec('Year by year', `Each column is one full year, January to December, from 2022; ${y1} is the year to date (January to ${FMON[lm - 1]}). In each cell: (change against the year before) <b>value</b>; green = up, red = down.${ytd ? ` The change into ${y1} compares with January–${FMON[lm - 1]} ${y1 - 1}, the same months.` : ''} Labour rate = labour revenue ÷ billed hours; cash and warranty labour rates = the same on cash lines and on warranty lines. Oil price = oil revenue ÷ litres. Repeat vehicles = vehicles of the year that also came in the 12 months before it. Follows the branch and EM/BS filter; not the month range.`,
    table(head, rows, { align: [''].concat(years.map(() => 'num')), fullHead: () => head, fullFn: full }));
}
function pageHistory() {
  const S = A.S, T = A.T; if (!S || !S.n) return emptyData();
  const H = histYears(); if (!H) return '<div class="empty"><strong>No months loaded yet.</strong></div>';
  const { years, lastYm, y0 } = H, f0 = F();
  const all = ['EM', 'BS'], range = `every month from January ${y0} to ${ymLbl(lastYm)}`;
  const foot = ' Follows the branch filter; not the month range or the EM/BS filter. Months before the transaction data use the actual from the target files where they have one.';
  let h = histYearSec();
  // 18.2: “4- Total Renault — Total Sales” from the target reports (budget, achieve, % achieve), in thousands in the file
  {
    const scale = Number(A.cfg.targetScale) || 1, tsOf = ym => { const d = A.imports.find(x => x.kind === 'target' && x.period === C.ymStr(ym)); return d && d.ext && d.ext.totalSales ? d.ext.totalSales : null; };
    const months = A.imports.filter(x => x.kind === 'target' && x.ext && x.ext.totalSales).map(x => +x.period.replace('-', ''));
    if (months.length) {
      const yrs = [...new Set(months.map(m => Math.floor(m / 100)))].sort(), lastT = Math.max(...months);
      h += histTable('Total Renault sales by month (target report)', `“4- Total Renault — Total Sales” as reported in each monthly target report (Daily Sales Report): Budget, Achieve and % Achieve, ${yrs[0]} to ${ymLbl(lastT)}. It includes external parts sales (counter, dealer, wholesale) besides the workshops, so it is higher than the revenue elsewhere in the app. Under each achieved and budget value: the change against the same month of the year before (for the first year, against the “last year” column of the same report); green = up, red = down. Months without a saved total are re-read when their target file is uploaded again.`, yrs, lastT,
        ym => { const t = tsOf(ym); if (!t) return { ach: NaN, target: NaN }; return { ach: Number.isFinite(t.actual) ? t.actual * scale : NaN, target: t.budget > 0 ? t.budget * scale : NaN, prevAch: t.prior > 0 ? t.prior * scale : NaN }; }, { target: true, yoy: true });
    } else h += histTable('Total Renault sales by month (target report)', '“4- Total Renault — Total Sales” (Budget, Achieve, % Achieve) from each monthly target report. <b>No saved target report has this line yet:</b> upload the monthly target Excel files again in Data &amp; imports (you can select them all, or the whole folder, at once). The app reads the line and fills this table; nothing else in the saved reports changes.', years, lastYm, () => ({ ach: NaN, target: NaN }), { target: true });
  }
  h += `<div class="notice">Each table below has the months January to December as rows and one block of columns per year. Green % = 100% of target or more; the change chips compare the same month with the year before.</div>`;
  // 1. total revenue against target (the same figures as Target achievement elsewhere)
  h += histTable('Achieved, target and % of achievement by month', `Revenue against the monthly target, ${range}. Achieved = invoiced revenue of the units that have a target; % = achieved ÷ target. Under each achieved and target value: the change against the same month of the year before (green = up, red = down).${foot}`, years, lastYm,
    ym => { const c = histCell({ comp: 0, scopes: all, tb: ['budget'], ta: ['actual'], prior: true }, ym);
      // the same month a year earlier from this month's target file (“last year” column), used for the first year shown
      const t = T && T.byMonth.get(ym); if (t) { let p = 0; for (const [u, tu] of t.units) { const ui = S.units.indexOf(u); if (ui < 0 || (f0.branches && !f0.branches.has(S.unitBranch[ui]))) continue; p += tu.prior || 0; } if (p > 0) c.prevAch = p; }
      return c; }, { target: true, yoy: true });
  // 2. oil
  const oilByYm = (() => { const cov = [...A.coverage]; if (!cov.length) return new Map(); const o = oilCalc(F({ s: Math.min(...cov), e: Math.max(...cov) })); return o.ym; })();
  h += histTable('Oil consumed by month (litres)', `Litres of the oils in the oil list (Parts tab), ${range}; the change is against the same month a year earlier.${foot}`, years, lastYm,
    ym => { const o = oilByYm.get(ym); return { ach: A.coverage.has(ym) ? (o ? o.l : 0) : NaN }; }, { fmt: v => fmtL(v) });
  // 3–6. parts, labour, other, labour + other against their own targets
  h += histTable('Parts revenue by month', `Parts revenue against the parts target, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: 1, scopes: all, tb: ['parB'], ta: ['parA'] }, ym), { target: true });
  h += histTable('Labour revenue by month', `Labour revenue against the labour target, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: 2, scopes: all, tb: ['labB'], ta: ['labA'] }, ym), { target: true });
  h += histTable('Other revenue by month', `Other revenue (neither parts nor labour) against the other target, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: 3, scopes: all, tb: ['othB'], ta: ['othA'] }, ym), { target: true });
  h += histTable('Labour + other revenue by month', `Labour and other revenue together against the labour and other targets together, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: [2, 3], scopes: all, tb: ['labB', 'othB'], ta: ['labA', 'othA'] }, ym), { target: true });
  // 7–8. warranty and cash (no target of their own)
  h += histTable('Warranty revenue by month', `Revenue billed to warranty, ${range}; the change is against the same month a year earlier.${foot}`, years, lastYm, ym => histCell({ comp: 5, scopes: all }, ym));
  h += histTable('Cash revenue by month', `Revenue paid by customers (all but warranty), ${range}; the change is against the same month a year earlier.${foot}`, years, lastYm, ym => histCell({ comp: 4, scopes: all }, ym));
  // 9–10. EM and BS against their own targets
  h += histTable('EM revenue by month', `Mechanical units (EM, PDI lines included) against the EM target, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: 0, scopes: ['EM'], tb: ['budget'], ta: ['actual'] }, ym), { target: true });
  h += histTable('BS revenue by month', `Bodyshop units (BS) against the BS target, ${range}.${foot}`, years, lastYm, ym => histCell({ comp: 0, scopes: ['BS'], tb: ['budget'], ta: ['actual'] }, ym), { target: true });
  // 11. the target itself
  h += histTable('Target by month', `The monthly revenue target (EM + BS) from the target files, ${range}; the change is against the same month a year earlier.${foot}`, years, lastYm,
    ym => { const t = T && T.byMonth.get(ym); if (!t) return { ach: NaN }; let b = 0; for (const [u, tu] of t.units) { const ui = S.units.indexOf(u); if (ui < 0) continue; if (f0.branches && !f0.branches.has(S.unitBranch[ui])) continue; b += tu.budget || 0; } return { ach: b > 0 ? b : NaN }; });
  return h;
}

function pageCwDetail() {
  const S = A.S; if (!S || !S.n) return '<div class="section empty"><strong>No data</strong>Import the DSR files in Data &amp; imports.</div>';
  const st = cwSort();
  let h = `<div class="section"><div class="sec-head"><div><h2>Sort the lists</h2><p>Revenue = signed net invoiced. Count = units sold for parts, times billed for a job description (labour). PDI is not included. Each chart has its full list (“Show the table”) and the same list split by branch (“Show by branch”). Parts charts show RN- part numbers; every other part number is at the end of the tab.</p></div><div class="seg" role="group" aria-label="Sort by">${[['rev', 'By revenue'], ['cnt', 'By count']].map(([v, l]) => `<button class="btn ${st === v ? '' : 'secondary'}" data-act="cwsort" data-v="${v}">${l}</button>`).join(' ')}</div></div></div>`;
  for (const [act, nm] of [[0, 'EM — express & mechanical'], [1, 'BS — body & paint']]) {
    h += `<h2 class="group-title" style="margin:28px 0 10px">${nm}</h2>`;
    h += cwSection('parts', act, 1) + cwSection('labour', act, 1) + cwSection('parts', act, 0) + cwSection('labour', act, 0);
  }
  h += `<h2 class="group-title" style="margin:28px 0 10px">Other part numbers — not starting with RN-</h2>`;
  for (const act of [0, 1]) h += cwSection('other', act, 1) + cwSection('other', act, 0);
  return h;
}
function pageFollowup() {
  const S = A.S;
  const fu = C.followUp(S, A.schedules, A.cfg, { branches: curSet(false) });
  const st = A.fuStatus;
  const list = fu.rows.filter(r => st === 'all' || r.status === st);
  let h = '';
  if (!A.schedules.length) h += `<div class="notice">No maintenance schedule is loaded, so follow-up uses the 12-month time rule only. Upload <b>service 19-10-2026 (1).xlsx</b> and <b>new model service 19-10-2026 (1).xlsx</b> in Data &amp; imports to add model-specific mileage intervals.</div>`;
  h += cards([
    { label: 'Overdue', value: fmtInt(fu.counts.overdue), count: true, note: `Due before ${dayLbl(fu.cutoff)} (latest data date)`, t: 't-mag' },
    { label: 'Due within 30 days', value: fmtInt(fu.counts.soon), count: true, note: 'Next maintenance falls in the coming month', t: 't-amber' },
    { label: 'Upcoming', value: fmtInt(fu.counts.upcoming), count: true, note: 'Due later', t: 't-blue' },
    { label: 'Vehicles tracked', value: fmtInt(fu.counts.total), count: true, note: 'With a recognised maintenance or PDI date', t: 't-dark' },
  ]);
  const chips = [['overdue', 'Overdue'], ['soon', 'Due ≤ 30 days'], ['upcoming', 'Upcoming'], ['all', 'All']].map(x => `<button class="choice ${st === x[0] ? 'on' : ''}" data-act="fu" data-v="${x[0]}">${x[1]}</button>`).join('');
  const shown = list.slice(0, 250);
  h += sec('Follow-up candidates', 'Due date = whichever comes first: 12 months after the last recognised maintenance (or the PDI date as a delivery proxy), or the next scheduled mileage when the vehicle’s own km readings give a usage rate. Mileage is read from job descriptions such as “30K Periodic Maintenance”; nothing is invented when it is missing.', `<div class="choices">${chips}${A.caps.downloads ? `<button class="btn small secondary" data-act="fucsv">Download CSV (${fmtInt(list.length)})</button>` : ''}</div>` + table(['VIN', 'Model', 'Branch', 'Calculation basis', 'Base date', 'Last km', 'Next km', 'Due', 'Due by', 'Last visit', 'Status'], shown.map(r => [`<span style="font-family:ui-monospace,monospace;font-size:11.5px">${esc(r.vin)}</span>`, esc(r.model), esc(r.branch), esc(r.basis), dayLbl(r.base), r.perKm ? fmtInt(r.perKm) : '—', r.nextKm ? fmtInt(r.nextKm) : '—', dayLbl(r.due), `<span class="mini">${esc(r.dueBy)}</span>`, dayLbl(r.lastVisit), `<span class="tag ${r.status === 'overdue' ? 'below' : r.status === 'soon' ? 'near' : 'blue'}">${r.status === 'overdue' ? 'Overdue' : r.status === 'soon' ? 'Due soon' : 'Upcoming'}</span>`]), { align: ['', '', '', '', 'num', 'num', 'num', 'num', '', 'num', ''], maxH: 560 }) + (list.length > shown.length ? `<div class="mini" style="margin-top:8px">Showing the first ${shown.length} of ${fmtInt(list.length)} by due date. Download the CSV for the full list.</div>` : ''));
  h += scheduleSection();
  return h;
}
function scheduleSection() {
  const S = A.S;
  if (!A.schedules.length) return '';
  const vinModels = new Map(); for (let i = 0; i < S.n; i++) if (S.vin[i] >= 0) { const m = S.models[S.model[i]]; let s = vinModels.get(m); if (!s) { s = new Set(); vinModels.set(m, s); } s.add(S.vin[i]); }
  const models = [...vinModels].sort((a, b) => b[1].size - a[1].size).slice(0, 60);
  const admin = isAdmin();
  const opts = sel => `<option value="">Automatic</option><option value="-" ${sel === '-' ? 'selected' : ''}>No schedule</option>` + A.schedules.map(s => `<option ${sel === s.model ? 'selected' : ''}>${esc(s.model)}</option>`).join('');
  const rows = models.map(([m, set]) => { const o = (A.cfg.modelSchedule || {})[m] || ''; const s = C.matchSchedule(m, A.schedules, A.cfg); return [esc(m), fmtInt(set.size), admin ? `<select class="cell" data-act="modelsched" data-model="${esc(m)}">${opts(o)}</select>` : esc(o || 'Automatic'), s ? esc(s.model) : '<span class="mini">None (time rule only)</span>', s ? `${fmtInt(s.interval)} km` : '—'] });
  const sched = A.schedules.map(s => [esc(s.model), `${fmtInt(s.interval)} km`, `<span class="mini">${s.milestones.slice(0, 14).map(k => k / 1000 + 'K').join(' · ')}${s.milestones.length > 14 ? ' …' : ''}</span>`, '12 months']);
  return sec('Maintenance schedules', 'Model-specific schedules from the uploaded files. The 8,000 km interval applies only where the newer-model schedule says so.', table(['Schedule', 'Interval', 'Milestones', 'Time rule'], sched, { align: ['', 'num', '', 'num'] }) + `<h3>Model to schedule</h3><p class="desc">Automatic matching uses the model name, engine and generation. ${admin ? 'Override any line; changes apply immediately.' : ''}</p>` + table(['Transaction model', 'Vehicles', 'Override', 'Schedule used', 'Interval'], rows, { align: ['', 'num', '', '', 'num'], maxH: 420 }));
}

/* ======================= page: data & imports ======================= */
function pageData() {
  const admin = isAdmin();
  const txn = A.imports.filter(d => d.kind === 'txn').sort((a, b) => a.period.localeCompare(b.period));
  const tg = A.imports.filter(d => d.kind === 'target').sort((a, b) => a.period.localeCompare(b.period));
  const sc = A.imports.filter(d => d.kind === 'schedule');
  const last = A.imports.reduce((m, d) => Math.max(m, d.uploadedAt || 0), 0);
  const drive = A.imports.some(d => d.source === 'drive');
  let h = admin ? uploadSection() + (A.staging.length ? stagingSection() : '') : `<div class="notice"><b>You are signed in as a viewer.</b> Uploading and changing data is for administrators. Ask the administrator to upload the files or to give your account the admin role.</div>`;
  const state = A.cloud === 'live' ? `<span class="pill live"><i class="dot" style="background:currentColor"></i>Cloud storage connected</span>` : A.cloud === 'off' ? `<span class="pill off"><i class="dot" style="background:currentColor"></i>Cloud storage unavailable</span>` : `<span class="pill warn">Connecting…</span>`;
  h += `<div class="section"><div class="sec-head"><div><h2>Data state</h2><p>${A.cloud === 'off' ? 'This view cannot reach the artifact\'s cloud storage (for example, a local copy of the page). Files you add here stay in this browser tab only and are lost on reload.' : 'Uploaded files are parsed in your browser, then saved to this artifact\'s private cloud storage. Anyone you share the artifact with sees the same saved data on phone or laptop.'}</p></div>${state}</div>
  <div class="kv"><div><span>Mode</span><b>${drive ? 'Google Drive import (manual check)' : 'Manual snapshot'}</b></div><div><span>Latest billing date</span><b>${A.S && A.S.n ? dayLbl(A.S.maxDay) : '—'}</b></div><div><span>Last import</span><b>${tsLbl(last)}</b></div><div><span>Transaction months</span><b>${txn.length}</b></div><div><span>Target months</span><b>${tg.length}</b></div><div><span>Schedules</span><b>${sc.reduce((t, d) => t + (d.models || []).length, 0)} models</b></div></div>
  <p class="mini" style="margin-top:8px">Nothing syncs automatically. “Synced” is never shown; each import records its source, date and uploader below.</p>${A.loadErr.length ? `<div class="notice err">${A.loadErr.map(esc).join('<br>')}</div>` : ''}</div>`;
  h += coverageSection(txn, tg);
  h += importsSection(txn, tg, sc);
  if (A.editTarget) h += targetEditor();
  if (A.S && A.S.n) h += reconciliationSection(txn, tg);
  h += mappingsSection();
  h += auditSection();
  return h;
}
function coverageSection(txn, tg) {
  const tx = new Set(txn.map(d => d.period)), tt = new Set(tg.map(d => d.period));
  const years = new Set([...tx, ...tt].map(p => +p.slice(0, 4))); const now = new Date().getFullYear(); [2024, 2025, now].forEach(y => years.add(y));
  const ys = [...years].sort();
  const cell = (y, m) => { const k = `${y}-${String(m).padStart(2, '0')}`; const a = tx.has(k), b = tt.has(k); return `<td title="${k}: ${a ? 'transactions' : 'no transactions'}, ${b ? 'target' : 'no target'}"><span class="${a ? 'ok' : 'no'}">${a ? '●' : '○'}</span> <span class="${b ? 'ok' : 'no'}" style="font-size:10px">${b ? 'T' : '–'}</span></td>`; };
  pushBlock({ type: 'table', head: ['Year'].concat(MON), rows: ys.map(y => [String(y)].concat(MON.map((_, i) => { const k = `${y}-${String(i + 1).padStart(2, '0')}`; return (tx.has(k) ? 'Txn' : '–') + (tt.has(k) ? ' + T' : ''); }))) });
  return sec('Coverage', '● transactions loaded · T target loaded. Months without a file are treated as missing, not as zero.', `<div class="scroll"><table class="cov"><thead><tr><th></th>${MON.map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>${ys.map(y => `<tr><td class="y">${y}</td>${MON.map((_, i) => cell(y, i + 1)).join('')}</tr>`).join('')}</tbody></table></div>`);
}
function uploadSection() {
  const zone = (id, title, desc) => `<div class="drop" data-drop="${id}"><h3>${title}</h3><div class="mini">${desc}</div><div class="row"><label class="btn small">Choose folder<input type="file" id="in-${id}-dir" webkitdirectory directory multiple hidden data-hint="${id}"></label><label class="btn small secondary">Choose files<input type="file" id="in-${id}-files" multiple accept=".xlsx,.xls,.xlsm,.csv,.zip" hidden data-hint="${id}"></label></div><div class="mini">or drop files / a .zip here</div></div>`;
  const dc = A.cfg.drive || {};
  const dl = A.drive.list;
  let driveBody = `<p class="desc">Reads the folders below through your Google Drive connection (read-only), lists new or changed files and brings them into the review step. Google Sheets are exported as .xlsx.</p>
  <div class="toolbar" style="margin:0 0 10px"><div class="field wide"><label for="drv-txn">DSR achieved (transactions) folder ID</label><input id="drv-txn" class="inp" value="${esc(dc.txn || '')}"></div><div class="field wide"><label for="drv-tg">Target folder ID</label><input id="drv-tg" class="inp" value="${esc(dc.targets || '')}"></div><div class="field wide"><label for="drv-sc">Schedules folder ID (optional)</label><input id="drv-sc" class="inp" value="${esc(dc.schedules || '')}"></div><button class="btn" data-act="drivecheck" ${A.drive.busy ? 'disabled' : ''}>${A.drive.busy ? 'Checking…' : 'Check Google Drive'}</button></div>`;
  if (!A.caps.mcp) driveBody += `<div class="notice">Google Drive is not reachable from this view. Use folder or zip upload instead.</div>`;
  if (A.drive.err) driveBody += `<div class="notice err">${esc(A.drive.err)}</div>`;
  if (dl) {
    const newOnes = dl.filter(x => x.state !== 'same');
    driveBody += `<p class="desc"><b>${dl.length}</b> spreadsheet(s) found; <b>${newOnes.length}</b> new or changed since the last import.</p>` + table(['', 'File', 'Folder', 'Modified', 'State'], dl.map((x, i) => [`<input type="checkbox" data-act="drivepick" data-i="${i}" ${x.pick ? 'checked' : ''} aria-label="Select ${esc(x.title)}">`, esc(x.title), `<span class="mini">${esc(x.path)}</span>`, tsLbl(Date.parse(x.modifiedTime)), x.state === 'new' ? '<span class="tag blue">New</span>' : x.state === 'changed' ? '<span class="tag near">Changed</span>' : '<span class="tag on">Already imported</span>']), { align: ['', '', '', 'num', ''], maxH: 340 }) + `<div style="margin-top:10px"><button class="btn yellow" data-act="drivefetch" ${A.drive.busy || !dl.some(x => x.pick) ? 'disabled' : ''}>Download &amp; review ${dl.filter(x => x.pick).length} file(s)</button></div>`;
  }
  return '<div id="upload"></div>' + sec('Upload data', 'Upload a whole folder (sub-folders by year are fine), individual Excel files, or the .zip that Google Drive produces when you download a folder. Every file is checked and shown for review before anything is saved. The file type is detected from its content.', `<div class="drops">${zone('txn', 'DSR achieved folder', 'Monthly transaction exports (CA+WR+PDI invoice lines)')}${zone('target', 'Target folder', 'Monthly Daily Sales Report with budget and working days')}${zone('schedule', 'Service schedules', 'Model maintenance schedule workbooks')}</div><details class="box"${dl || A.drive.err ? ' open' : ''}><summary>Import from Google Drive</summary>${driveBody}</details>`);
}
function stagingSection() {
  const st = A.staging;
  const rep = st.filter(x => x.action === 'replace').length;
  const go = st.filter(x => x.action === 'import' || x.action === 'replace').length;
  const rows = st.map((x, i) => {
    const r = x.res || {};
    let what = '', issues = [];
    if (r.kind === 'txn') {
      const s = r.stats; what = `${fmtInt(s.lines)} lines → ${fmtInt(s.groups)} records`;
      const recon = Math.abs(s.net - s.storedNet - s.invalidDateNet) < 1;
      issues.push(recon ? `<span class="tag on">Revenue reconciles: ${egp(s.net)}</span>` : `<span class="tag below">Reconciliation gap ${egp(s.net - s.storedNet)}</span>`);
      if (s.invalidDate) issues.push(`<span class="tag below">${fmtInt(s.invalidDate)} invalid dates (${egp(s.invalidDateNet)}) kept for review</span>`);
      if (s.missingVin) issues.push(`<span class="tag near">${fmtInt(s.missingVin)} lines without VIN</span>`);
      if (s.missingOrder) issues.push(`<span class="tag near">${fmtInt(s.missingOrder)} lines without RO</span>`);
      if (s.identicalLines) issues.push(`<span class="tag">${fmtInt(s.identicalLines)} identical lines kept</span>`);
      const months = Object.keys(s.months); if (months.length > 1) issues.push(`<span class="tag">${months.length} billing months (late-posted lines stay in their billing month)</span>`);
      if (x.unknownPlants && x.unknownPlants.length) issues.push(`<span class="tag below">Unknown plants: ${esc(x.unknownPlants.join(', '))}</span>`);
      if (x.overlap) issues.push(`<span class="tag near">${fmtInt(x.overlap)} records also in other saved files (possible duplicates)</span>`);
      if (r.fileYm && r.fileYm !== r.period) issues.push(`<span class="tag near">File name says ${esc(r.fileYm)}, most lines are ${esc(r.period)}</span>`);
    } else if (r.kind === 'target') {
      what = `${r.entries.length} unit rows · ${r.wd ? r.wd + ' working days' : 'no working days'}`;
      (r.warnings || []).forEach(w => issues.push(`<span class="tag near">${esc(w)}</span>`));
      const unk = r.entries.filter(e => { const x = C.resolveTargetRow(e.raw, A.cfg); return !x.unit && x.source !== 'ignored'; }); if (unk.length) issues.push(`<span class="tag below">Unmapped rows: ${esc(unk.map(e => e.raw).join(', '))}</span>`);
    } else if (r.kind === 'schedule') { what = `${r.models.length} model schedules`; }
    else issues.push(`<span class="tag below">${esc(r.error || x.error || 'Could not read')}</span>`);
    if (x.dup) issues.unshift('<span class="tag on">Identical to saved file</span>');
    if (x.conflict && !x.dup) issues.unshift(`<span class="tag near">Replaces saved ${esc(x.conflict.fileName || x.conflict.period)}</span>`);
    const can = r.ok;
    const actions = can ? `<select class="cell" data-act="stageact" data-i="${i}">${x.conflict ? `<option value="replace" ${x.action === 'replace' ? 'selected' : ''}>Replace saved</option>` : `<option value="import" ${x.action === 'import' ? 'selected' : ''}>Import</option>`}<option value="skip" ${x.action === 'skip' ? 'selected' : ''}>Skip</option></select>` : 'Skip';
    return [`<b>${esc(x.name)}</b><div class="mini">${esc(x.path || '')}${x.source === 'drive' ? ' · Google Drive' : x.source === 'zip' ? ' · from zip' : ''}</div>`, r.kind === 'txn' ? 'Transactions' : r.kind === 'target' ? 'Target' : r.kind === 'schedule' ? 'Schedule' : 'Unknown', r.period ? esc(r.period) : '—', what, issues.join(' ') || '<span class="mini">No issues</span>', actions];
  });
  const tbl = table(['File', 'Type', 'Period', 'Content', 'Validation', 'Action'], rows, { align: ['', '', '', '', '', ''] }); const it = takeItem('Review before saving', '');
  return `<div class="section" id="review"><div class="sec-head"><div><h2>${it ? numBadge(it.id) : ''}Review before saving</h2><p>Nothing is saved until you confirm. Re-uploading a month replaces that month, so data is never double-counted; identical files are skipped.</p></div><button class="btn small secondary" data-act="stageclear">Discard all</button></div>${tbl}
  <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px">${rep ? `<label class="choice"><input type="checkbox" data-act="stageconfirm" ${A.stagingConfirm ? 'checked' : ''}> I confirm replacing ${rep} saved period(s)</label>` : ''}<button class="btn yellow" data-act="stagesave" ${!go || (rep && !A.stagingConfirm) ? 'disabled' : ''}>Save ${go} file(s) to cloud</button></div></div>`;
}
function importsSection(txn, tg, sc) {
  const admin = isAdmin();
  const act = d => (admin ? `<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">${d.kind === 'target' ? `<button class="btn small secondary" data-act="edittarget" data-id="${esc(d.id)}">Edit</button>` : ''}<label class="btn small secondary">Replace<input type="file" hidden accept=".xlsx,.xls,.xlsm,.csv" data-hint="${d.kind}" data-replace="${esc(d.id)}"></label>${A.confirmDel === d.id ? `<button class="btn small danger" data-act="delconfirm" data-id="${esc(d.id)}">Confirm delete</button><button class="btn small secondary" data-act="delcancel">Cancel</button>` : `<button class="btn small secondary" data-act="del" data-id="${esc(d.id)}">Delete</button>`}</div>` : '');
  const by = d => esc(d.uploadedByName || (d.uploadedBy && d.uploadedBy === A.myId ? 'You' : '') || '—');
  let body = '';
  body += `<h3>Transactions (DSR achieved)</h3>` + table(['Period', 'File', 'Source', 'Lines', 'Revenue (signed)', 'Discount', 'Issues', 'Uploaded', ''], txn.map(d => { const s = d.stats || {}; return [esc(d.period), esc(d.fileName), esc(d.source || 'upload'), fmtInt(s.lines), egp(s.net), egp(s.disc), `${s.invalidDate ? `<span class="tag below">${s.invalidDate} invalid dates</span>` : ''}${s.missingVin ? ` <span class="tag near">${s.missingVin} no VIN</span>` : ''}` || '—', `<span class="mini">${tsLbl(d.uploadedAt)}<br>${by(d)}</span>`, act(d)]; }), { align: ['', '', '', 'num', 'num', 'num', '', '', 'num'] });
  body += `<h3>Targets and working days</h3>` + table(['Month', 'File', 'Units', 'Working days', 'Total target (source units)', 'Uploaded', ''], tg.map(d => [esc(d.period), esc(d.fileName), String((d.entries || []).length), d.wd ? `${d.elapsed && d.elapsed !== d.wd ? d.elapsed + '/' : ''}${d.wd}` : '<span class="tag below">Missing</span>', fmtInt((d.entries || []).reduce((t, e) => t + (e.budget || 0), 0)), `<span class="mini">${tsLbl(d.uploadedAt)}<br>${by(d)}</span>${d.editedAt ? `<br><span class="tag near">Edited ${tsLbl(d.editedAt)}</span>` : ''}`, act(d)]), { align: ['', '', 'num', 'num', 'num', '', 'num'] });
  body += `<h3>Service schedules</h3>` + table(['File', 'Models', 'Uploaded', ''], sc.map(d => [esc(d.fileName), `<span class="mini">${esc((d.models || []).map(m => m.model).join(' · '))}</span>`, `<span class="mini">${tsLbl(d.uploadedAt)}</span>`, act(d)]), { align: ['', '', '', 'num'] });
  if (admin && A.imports.length) body = deleteAllPanel(txn, tg, sc) + body;
  return sec('Saved files', admin ? 'Replace a period by uploading its new export, edit target values in place, or delete a file. Every change is recorded in the audit history.' : 'Files currently used for the dashboard.', body);
}
function deleteAllPanel(txn, tg, sc) {
  const st = A.delAll || (A.delAll = { open: false, kinds: new Set(['txn', 'target', 'schedule']), text: '' });
  if (!st.open) return `<div style="display:flex;justify-content:flex-end;margin:0 0 12px"><button class="btn danger" data-act="delallopen">Delete all uploaded data…</button></div>`;
  const kinds = [['txn', 'Transactions (DSR achieved)', txn.length], ['target', 'Targets and working days', tg.length], ['schedule', 'Service schedules', sc.length]];
  const n = A.imports.filter(d => st.kinds.has(d.kind)).length;
  return `<div class="notice err" style="margin:0 0 14px"><b>Delete all uploaded data</b> — removes the chosen saved files for everyone, on every device. It cannot be undone; you would need to upload the folders again. Mappings, settings, users and the audit history are kept.
  <div class="choices" style="margin:10px 0">${kinds.map(([k, label, c]) => `<label class="choice ${st.kinds.has(k) ? 'on' : ''}"><input type="checkbox" data-act="delallkind" value="${k}" ${st.kinds.has(k) ? 'checked' : ''} ${c ? '' : 'disabled'}> ${label} · ${fmtInt(c)}</label>`).join('')}</div>
  <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap"><div class="field" style="max-width:260px"><label for="delall-text">Type DELETE to confirm</label><input id="delall-text" class="inp" data-delall="1" value="${esc(st.text)}" autocomplete="off"></div><button class="btn danger" data-act="delallgo" ${st.text.trim().toUpperCase() === 'DELETE' && n ? '' : 'disabled'}>Delete ${fmtInt(n)} file${n === 1 ? '' : 's'}</button><button class="btn secondary" data-act="delallcancel">Cancel</button></div></div>`;
}
async function deleteAllImports() {
  const st = A.delAll; if (!st) return;
  const list = A.imports.filter(d => st.kinds.has(d.kind)); if (!list.length) return;
  let done = 0, failed = 0;
  setBusy(`Deleting ${list.length} saved files`, 0);
  for (const d of list) {
    try {
      if (A.local) A.imports = A.imports.filter(x => x.id !== d.id);
      else { await A.caps.db.collection('imports').doc(d.id).delete(); for (const aid of d.assetIds || []) { try { await A.caps.assets.delete(aid); } catch (e) {} A.assetCache.delete(aid); IDB.del(aid); } }
    } catch (e) { failed++; }
    done++; setBusy(`Deleting saved files (${done} of ${list.length})`, done / list.length);
  }
  IDB.del('store-snapshot');
  await audit('Deleted all files', `${list.length - failed} files deleted (${[...st.kinds].join(', ')})${failed ? ` · ${failed} failed` : ''}`);
  setBusy(null); A.delAll = null;
  toast(failed ? `Deleted ${list.length - failed} files; ${failed} could not be deleted — try again.` : `Deleted all ${list.length} files.`, !!failed);
  A.S = null; scheduleRebuild();
}
function targetEditor() {
  const d = A.imports.find(x => x.id === A.editTarget); if (!d) return '';
  const rows = (d.entries || []).map((e, i) => { const r = C.resolveTargetRow(e.raw, A.cfg); return [esc(e.raw), r.unit ? esc(r.unit) : r.source === 'ignored' ? '<span class="tag">Left out (workshop never opened)</span>' : '<span class="tag below">Unmapped</span>', `<input class="cell" type="number" step="any" id="te-b-${i}" value="${e.budget ?? ''}" aria-label="Budget ${esc(e.raw)}">`, `<input class="cell" type="number" step="any" id="te-a-${i}" value="${e.actual ?? ''}" aria-label="Actual ${esc(e.raw)}">`]; });
  const tbl = table(['Report row', 'Unit', 'Budget', 'DSR actual'], rows, { align: ['', '', 'num', 'num'] }); const it = takeItem('Edit target — ' + d.period, '');
  return `<div class="section"><div class="sec-head"><div><h2>${it ? numBadge(it.id) : ''}Edit target — ${esc(d.period)}</h2><p>Values are in the source report's units (scale: ${fmtInt(A.cfg.targetScale)} EGP per unit). Saving records an audit entry; the original file stays listed.</p></div></div>
  <div class="toolbar" style="margin:0 0 12px"><div class="field"><label for="te-wd">Working days in month</label><input id="te-wd" class="inp" type="number" value="${d.wd ?? ''}"></div><div class="field"><label for="te-el">Days to date (if partial)</label><input id="te-el" class="inp" type="number" value="${d.elapsed ?? ''}"></div></div>
  ${tbl}<div style="display:flex;gap:10px;margin-top:12px"><button class="btn yellow" data-act="savetarget" data-id="${esc(d.id)}">Save changes</button><button class="btn secondary" data-act="canceltarget">Cancel</button></div></div>`;
}
function reconciliationSection(txn, tg) {
  const S = A.S;
  const stored = new Map(); for (let i = 0; i < S.n; i++) { const k = S.srcIds[S.src[i]]; stored.set(k, (stored.get(k) || 0) + S.net[i]); }
  const scale = Number(A.cfg.targetScale) || 1;
  const rows = txn.map(d => {
    const s = d.stats || {}; const st = stored.get(d.id) || 0;
    const t = tg.find(x => x.period === d.period);
    const dsr = t ? (t.entries || []).reduce((a, e) => a + (C.resolveTargetRow(e.raw, A.cfg).unit ? (e.actual || 0) : 0), 0) * scale : NaN;
    const ok = Math.abs((s.net - (s.invalidDateNet || 0)) - st) < 1;
    return [esc(d.period), egp(s.net), egp(st), ok ? '<span class="tag on">Matches</span>' : `<span class="tag below">Gap ${egp(s.net - st)}</span>`, Number.isFinite(dsr) ? egp(dsr) : '<span class="mini">No target file</span>', Number.isFinite(dsr) ? egp(s.net - dsr) : '—'];
  });
  return sec('Reconciliation', 'Source = signed net of every line in the file. Stored = what the dashboard uses. The DSR column is the “Total Actual” reported in that month\'s target report; small differences usually come from lines billed after the report date.', table(['Period', 'Source revenue', 'Stored revenue', 'Check', 'DSR reported actual', 'Difference'], rows));
}
function owListTable() {
  const S = A.S; if (!S || !S.exList) return '';
  const thr = Number(A.cfg.owThreshold) || 50000, list = S.exList.filter(e => S.base.net[e.p] !== undefined && e.net >= thr).sort((a, b) => b.net - a.net);
  if (!S.exList.length) return '<p class="desc">No REN_EX_SRV lines in the saved files (files saved before this rule existed need re-importing).</p>';
  return `<p class="desc">${list.length} REN_EX_SRV line${list.length === 1 ? '' : 's'} at or above EGP ${fmtInt(thr)} in the saved data (of ${fmtInt(S.exList.length)} REN_EX_SRV lines), worth ${egp(list.reduce((t, e) => t + e.net, 0))}.</p>` + (list.length ? table(['Billing date', 'Branch', 'RO', 'VIN', 'Payer', 'C/W', 'Job description', 'Net'], list.slice(0, 200).map(e => [dayLbl(S.day[e.p]), esc(S.branches[S.br[e.p]]), esc((S.roKeys[S.ro[e.p]] || '').split('|')[1] || ''), S.vin[e.p] >= 0 ? esc(S.vins[S.vin[e.p]]) : '—', esc(S.payers[S.payer[e.p]] || ''), ['Cash', 'Warranty', 'PDI'][S.cw[e.p]], esc(e.job || ''), egp(e.net)]), { align: ['num', '', '', '', '', '', '', 'num'], maxH: 360 }) : '');
}
function mappingsSection() {
  const admin = isAdmin();
  const S = A.S; if (!S) return '';
  const branchOpts = (sel) => `<option value="">${'Automatic'}</option>` + BRANCH_ORDER.map(b => `<option ${sel === b ? 'selected' : ''}>${b}</option>`).join('');
  const plants = [...S.plants.values()].sort((a, b) => b.net - a.net);
  const plantRows = plants.map(p => { const o = (A.cfg.plants || {})[p.raw] || ''; const src = p.source === 'admin' ? '<span class="tag blue">Administrator</span>' : p.source === 'inferred' ? '<span class="tag near">Inferred — please confirm</span>' : p.source === 'rule' ? '<span class="tag on">Standard rule</span>' : '<span class="tag below">Unknown — map it</span>'; return [esc(p.raw), fmtInt(p.lines), egp(p.net), p.branch ? esc(p.branch) : '<span class="mini">Unmapped</span>', src, admin ? `<select class="cell" data-act="plantmap" data-raw="${esc(p.raw)}">${branchOpts(o)}</select>` : '']; });
  const tRows = new Map(); for (const d of A.imports.filter(x => x.kind === 'target')) for (const e of d.entries || []) tRows.set(e.raw, (tRows.get(e.raw) || 0) + 1);
  const unitOpts = sel => `<option value="">Automatic</option><option value="-" ${sel === '-' ? 'selected' : ''}>Ignore row</option>` + [...new Set(C.STANDARD_UNITS.concat(['Mobile Workshop EM', 'Sohag EM']))].map(u => `<option ${sel === u ? 'selected' : ''}>${u}</option>`).join('');
  const targetRows = [...tRows].map(([raw, n]) => { const r = C.resolveTargetRow(raw, A.cfg); const o = (A.cfg.targetRows || {})[raw] || ''; return [esc(raw), String(n), r.unit ? esc(r.unit) : '<span class="tag below">Unmapped</span>', admin ? `<select class="cell" data-act="trowmap" data-raw="${esc(raw)}">${unitOpts(o)}</select>` : '']; });
  const adv = Object.entries(A.cfg.advisers || {}).sort((a, b) => +a[0] - +b[0]);
  const advRows = adv.map(([code, name]) => [esc(code), admin ? `<input class="cell" style="width:180px;text-align:left" value="${esc(name)}" data-act="advname" data-code="${esc(code)}" aria-label="Name for code ${esc(code)}">` : esc(name), admin ? `<button class="btn small secondary" data-act="advdel" data-code="${esc(code)}">Remove</button>` : '']);
  const unknownCodes = S.advs.filter((a, i) => S.advInfo[i].status === 'unknown');
  const jobs = [...S.jobsMatched.values()].sort((a, b) => b.count - a.count);
  const jobRows = jobs.slice(0, 150).map(j => [esc(j.job), fmtInt(j.count), j.periodic ? '<span class="tag on">Periodic maintenance</span>' : '<span class="tag">Not counted</span>']);
  let body = `<details class="box"><summary>Plants → branches (${plants.length}${plants.some(p => !p.branch) ? `, ${plants.filter(p => !p.branch).length} unmapped` : ''})</summary><p class="desc">Branch performance combines a branch's EM, BS and PDI. Amerya EM includes the Amerya workshop, Le Garage Amerya and Marina North Coast. Zamalek → Mohandessin is an inferred mapping.</p>${table(['Plant in source', 'Lines', 'Revenue', 'Branch', 'Rule', admin ? 'Override' : ''], plantRows, { align: ['', 'num', 'num', '', '', ''] })}
  <label class="choice" style="margin-top:10px"><input type="checkbox" data-act="foad" ${A.cfg.foadRule !== false ? 'checked' : ''} ${admin ? '' : 'disabled'}> Count A.M. Foad at Amerya as body shop (BS)</label></details>`;
  body += `<details class="box"><summary>Target report rows → units (${targetRows.length})</summary><p class="desc">Sub-totals and totals are skipped automatically. Rows mapped to the same unit are added together.</p>${table(['Row in target report', 'Months', 'Unit', admin ? 'Override' : ''], targetRows, { align: ['', 'num', '', ''] })}
  <div class="toolbar" style="margin:12px 0 0"><div class="field"><label for="tscale">Target report units</label><select id="tscale" data-act="tscale" ${admin ? '' : 'disabled'}>${[[1, 'EGP'], [1000, 'Thousand EGP'], [1000000, 'Million EGP']].map(([v, l]) => `<option value="${v}" ${Number(A.cfg.targetScale) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div></details>`;
  body += targetAdjBox(admin);
  body += `<details class="box"><summary>Advisor IDs (${adv.length})${unknownCodes.length ? ` · ${unknownCodes.length} unmapped in data` : ''}</summary><p class="desc">Each advisor shows as “Name (ID)” everywhere in the app and its outputs. The ID is found both ways: a numeric code in the source gets its name, and a name in the source gets its ID. Unknown codes are shown as “Code 1234”; no names or IDs are invented. ${admin ? 'Upload an Excel with an advisor-name column and an ID column (for example the “Service advisors” sheet with its DMS code column filled) to add many at once.' : ''}</p>${admin ? `<div class="toolbar" style="margin:0 0 12px"><button class="btn small secondary" data-act="advupload">Upload advisor IDs (Excel)</button><input type="file" id="adv-file" accept=".xlsx,.xls,.xlsm,.csv" hidden></div>` : ''}${table(['ID', 'Name', ''], advRows, { align: ['', '', 'num'] })}${admin ? `<div class="toolbar" style="margin:12px 0 0"><div class="field"><label for="adv-code">ID</label><input id="adv-code" class="inp" inputmode="numeric" value="${esc((unknownCodes[0] || '').replace('Code ', ''))}"></div><div class="field wide"><label for="adv-name">Name</label><input id="adv-name" class="inp"></div><button class="btn" data-act="advadd">Add mapping</button></div>` : ''}</details>`;
  body += `<details class="box"><summary>Periodic-maintenance rules (${jobs.filter(j => j.periodic).length} descriptions counted)</summary><p class="desc">A repair order counts as periodic maintenance when a job description matches the include pattern and not the exclude pattern (case-insensitive regular expressions). Spelling variants such as “Periodoic” and “Maintance” are covered.</p>
  <div class="toolbar" style="margin:0 0 12px"><div class="field wide"><label for="rule-inc">Include</label><input id="rule-inc" class="inp" value="${esc(A.cfg.periodicInclude)}" ${admin ? '' : 'disabled'}></div><div class="field wide"><label for="rule-exc">Exclude</label><input id="rule-exc" class="inp" value="${esc(A.cfg.periodicExclude)}" ${admin ? '' : 'disabled'}></div>${admin ? '<button class="btn" data-act="rulesave">Apply rules</button>' : ''}</div>${table(['Job description (candidates)', 'Lines', 'Classification'], jobRows, { align: ['', 'num', ''], maxH: 380 })}</details>`;
  body += `<details class="box"><summary>One-off warranty rule (${owDefined() ? 'defined' : 'not defined'})</summary><div class="toolbar" style="margin:0 0 10px;align-items:flex-end"><label class="choice"><input type="checkbox" data-act="owexsrv" ${A.cfg.owExSrv !== false ? 'checked' : ''} ${admin ? '' : 'disabled'}> REN_EX_SRV extra-service lines at or above</label><div class="field"><label for="ow-thr">Threshold (EGP)</label><input id="ow-thr" class="inp" type="number" value="${Number(A.cfg.owThreshold) || 50000}" ${admin ? '' : 'disabled'}></div>${admin ? '<button class="btn" data-act="owthr">Apply</button>' : ''}</div>${owListTable()}<p class="desc">One-off warranty is included by default. Other ways to identify it in the source (warranty lines with these RO types, or payers matching the pattern). Once a rule exists, an “Exclude one-off warranty” box appears in the filter bar.</p><div class="choices">${(S.splits || []).map(sp => `<label class="choice"><input type="checkbox" data-act="owsplit" value="${esc(sp)}" ${(A.cfg.owSplits || []).includes(sp) ? 'checked' : ''} ${admin ? '' : 'disabled'}> ${esc(sp)}</label>`).join('')}</div><div class="toolbar" style="margin:8px 0 12px;align-items:flex-end"><div class="field wide"><label for="ow-payer">Payer name pattern (regular expression)</label><input id="ow-payer" class="inp" value="${esc(A.cfg.owPayerRe || '')}" ${admin ? '' : 'disabled'}></div>${admin ? '<button class="btn" data-act="owpayer">Apply</button>' : ''}</div></details>`;
  return sec('Mappings and rules', admin ? 'Changes apply to all saved data immediately and are recorded in the audit history.' : 'Read-only for members.', body);
}
function auditSection() {
  if (!A.audit.length) return sec('Audit history', '', '<div class="mini">No changes recorded yet.</div>');
  return sec('Audit history', 'Latest 60 changes.', table(['When', 'Change', 'Detail', 'By'], A.audit.map(a => [`<span class="mini">${tsLbl(a.at)}</span>`, esc(a.action), `<span class="mini">${esc(a.detail)}</span>`, esc(a.byName || (a.by === A.myId ? 'You' : '—'))]), { align: ['', '', '', ''], maxH: 420 }));
}

/* ======================= page: team ======================= */
function pageTeam() {
  const admin = A.canEdit;
  let h = `<div class="section"><h2>Your access</h2><div class="kv"><div><span>Role</span><b>${A.canEdit ? 'Administrator' : A.cloud === 'off' ? 'Local preview' : 'Member (read-only)'}</b></div><div><span>Scope</span><b>${esc(A.scopeLabel)}</b></div><div><span>Signed in as</span><b>${esc((A.me && A.me.name) || '—')}</b></div></div></div>`;
  h += `<div class="notice"><b>How access works.</b> People get into the studio through the artifact's Share button. Anyone who can edit the artifact is an administrator here (imports, mappings, member scopes); everyone else is read-only. The branch scope below limits what a member sees in this app. It is applied when they open the page, not by a separate server, so it is not a security boundary: anyone the artifact is shared with can technically read all saved data. Share only with people allowed to see the full network.</div>`;
  if (!admin) return h;
  const nm = m => esc(A.names.get(m.uid) || m.label || 'Someone');
  const rows = A.members.map(m => [nm(m), Array.isArray(m.scope) && m.scope.length ? esc(m.scope.join(', ')) : 'Full network', `<span class="mini">${tsLbl(m.addedAt)}</span>`, `<button class="btn small secondary" data-act="memdel" data-id="${esc(m.id)}">Remove</button>`]);
  const hits = A.memHits.map((p, i) => `<button class="choice ${A.memPick === i ? 'on' : ''}" data-act="mempick" data-i="${i}">${esc(p.name || 'Someone')}</button>`).join('');
  h += sec('Member scopes', 'Find a person who already has access to the shared artifact, choose their branches, and save. Members without a scope see the full network.', table(['Member', 'Branches', 'Added', ''], rows, { align: ['', '', '', 'num'] }) + `<div class="toolbar" style="margin:14px 0 0;align-items:flex-start"><div class="field"><label for="mem-q">Find person</label><div style="display:flex;gap:8px"><input id="mem-q" class="inp" autocomplete="off" placeholder="Type a name"><button class="btn secondary" data-act="memsearch">Search</button></div><div class="choices">${hits || '<span class="mini">Search to list matching people.</span>'}</div></div><div class="field wide"><label>Branches (leave empty for full network)</label><div class="choices" style="margin:0">${BRANCH_ORDER.slice(0, 11).map(b => `<label class="choice"><input type="checkbox" class="mem-br" value="${esc(b)}"> ${esc(b)}</label>`).join('')}</div></div><button class="btn" data-act="memadd" ${A.memPick == null ? 'disabled' : ''}>Save member scope</button></div>`);
  return h;
}

/* ======================= render ======================= */
const FILTER_NOTES = {
  cwdetail: 'This tab splits EM and BS, and cash and warranty, itself: only the period, branch and one-off warranty filters apply.',
  focus: 'The top-parts charts and tables split EM and BS, and cash and warranty, themselves: only the period, branch and one-off warranty filters apply to them.',
  overview: 'Period comparisons (2.3) always end at the “To” month. Targets are not split by payer, so achievement covers cash + warranty.',
  alerts: 'The month-end forecast is for the latest month with data, so the From / To months do not change it. Targets are not split by payer.',
  trends: 'Daily billing compares the “To” month with the month before it.',
  branches: 'Targets are not split by payer, so achievement covers cash + warranty. EM / BS unit charts hide when the activity filter leaves them out.',
  parts: 'The parts budget is not split by payer, so parts achievement covers cash + warranty.',
  labour: 'Budgets are not split by payer, so achievement covers cash + warranty.',
  customers: 'Lapsed and at-risk vehicles use each vehicle’s whole history up to the latest billing date: only the branch filter applies.',
  pdi: 'PDI cohorts follow new vehicles from their PDI, and comebacks are mechanical (EM) visits: activity and payer do not apply.',
  followup: 'Follow-up uses each vehicle’s whole service history: only the branch filter applies.',
};
function renderToolbar() {
  const tb = $('toolbar'); const pid = PAGES[A.page].id;
  const show = A.S && A.S.n && !['data', 'team'].includes(pid) && !(pid === 'compare' && !(A.cx && A.cx.tab === 'classic'));
  tb.hidden = !show; if (!show) return;
  const months = monthOptions();
  const mo = (sel) => months.map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${ymLbl(m)}</option>`).join('');
  const names = branchNames();
  const fnote = FILTER_NOTES[pid];
  tb.dataset.note = fnote || '';
  tb.innerHTML = `<div class="field"><label for="f-s">From month</label><select id="f-s" data-f="s">${mo(A.f.s)}</select></div><div class="field"><label for="f-e">To month</label><select id="f-e" data-f="e">${mo(A.f.e)}</select></div>${pid === 'trends' ? `<div class="field"><label for="f-g">Group by</label><select id="f-g" data-f="group">${[['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']].map(x => `<option value="${x[0]}" ${A.f.group === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>` : ''}<div class="field wide"><label for="f-b">Branch</label><select id="f-b" data-f="branch"><option value="all">${A.scopeBranches ? 'All assigned branches' : 'All branches'}</option>${names.map(b => `<option ${A.f.branch === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div><div class="field"><label for="f-a">Activity</label><select id="f-a" data-f="act">${[['all', 'EM + BS + PDI'], ['EM+BS', 'EM + BS'], ['EM+PDI', 'EM + PDI'], ['EM', 'EM'], ['BS', 'BS'], ['PDI', 'PDI']].map(x => `<option value="${x[0]}" ${A.f.act === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div><div class="field"><label for="f-p">Payer</label><select id="f-p" data-f="pay">${[['all', 'Cash + warranty'], ['cash', 'Cash'], ['warranty', 'Warranty']].map(x => `<option value="${x[0]}" ${A.f.pay === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>${owDefined() ? `<label class="choice" style="align-self:flex-end;min-height:40px"><input type="checkbox" data-f="noOW" ${A.f.noOW ? 'checked' : ''}> Exclude one-off warranty</label>` : ''}<button class="btn secondary" data-act="reset" title="Back to the newest month, all branches, all activities and payers">Reset</button>${fnote ? `<p class="mini" style="flex-basis:100%;margin:2px 0 0">ⓘ ${esc(fnote)}</p>` : ''}`;
}
function render() {
  if (!A._outRestored) { A._outRestored = true; try { const v = localStorage.getItem('ps.outText'); if (v && !A.out.text) A.out.text = v; } catch (e) {} }
  saveOutText(); setTimeout(syncPicks, 0);
  const p = PAGES[A.page];
  switchFilters(p.id);
  $('nav').querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === A.page));
  $('pageTitle').textContent = p.title;
  { const ub = $('uploadBtn'); if (ub) ub.hidden = !(isAdmin() && A.importsLoaded && p.id !== 'data'); }
  const pill = $('statePill');
  if (A.cloud === 'connecting') { pill.className = 'pill warn'; pill.textContent = 'Connecting to cloud storage…'; }
  else if (A.cloud === 'off') { pill.className = 'pill off'; pill.innerHTML = '<i class="dot" style="background:currentColor"></i>Local session only'; }
  else if (A.cloud === 'error') { pill.className = 'pill off'; pill.textContent = 'Cloud storage error'; }
  else { pill.className = 'pill live'; pill.innerHTML = `<i class="dot" style="background:currentColor"></i>${A.S && A.S.n ? 'Data to ' + dayLbl(A.S.maxDay) : 'Cloud connected'}`; }
  $('railState').innerHTML = `<b>${A.cloud === 'live' ? 'Cloud workspace' : A.cloud === 'off' ? 'Local session' : 'Connecting…'}</b><br>${A.imports.filter(d => d.kind === 'txn').length} transaction months · ${A.imports.filter(d => d.kind === 'target').length} target months<br>${esc(A.scopeLabel)}`;
  renderToolbar();
  const err = A.f.s && A.f.e && A.f.s > A.f.e;
  $('error').textContent = err ? 'The start month comes after the end month. Choose an earlier From month.' : '';
  const S = A.S;
  let owLines = []; if (S && S.exList) owLines = C.applyOW(S, !!(A.f.noOW && A.cfg.owExSrv !== false), Number(A.cfg.owThreshold) || 50000);
  $('sub').textContent = S && S.n && !['data', 'team'].includes(p.id) ? `${ymLbl(A.f.s)} to ${ymLbl(A.f.e)} · ${scopeText()} · latest billing date ${dayLbl(S.maxDay)}` : p.id === 'data' ? 'Upload, review, replace and audit the source files behind every figure.' : p.id === 'team' ? 'Roles and branch scopes for the people this studio is shared with.' : (A.importsLoaded ? 'Upload the target and DSR achieved folders to begin.' : 'Loading saved data…');
  let html;
  numReset(A.page);
  if (!A.importsLoaded) html = `<div class="section empty"><strong>Loading saved data</strong>Connecting to the artifact's cloud storage.</div>`;
  else if (p.id === 'data') html = pageData();
  else if (p.id === 'team') html = pageTeam();
  else if (p.id === 'output') { html = pageOutput(); numReset(A.page); }
  else if (!S) html = `<div class="section empty"><strong>Preparing the dashboard</strong>Reading the saved files.</div>`;
  else if (!S.n) html = emptyData();
  else if (err) html = '<div class="section empty"><strong>Check the date range</strong>The start month must not come after the end month.</div>';
  else {
    try {
      A._visPage = p.id; A._foldBody = {};
      html = ({ overview: pageOverview, vtp: pageVtp, alerts: pageAlerts, parts: pageParts, bays: pageBays, ops: pageOps, labour: pageLabour, customers: pageCustomers, trends: pageTrends, compare: pageCompareAll, pdi: pagePdi, branches: pageBranches, models: pageModels, advisors: pageAdvisors, followup: pageFollowup, cwdetail: pageCwDetail, focus: pageFocus, history: pageHistory })[p.id](); A._visPage = null;
    }
    catch (e) { console.error(e); html = `<div class="section"><div class="notice err">This view could not be calculated: ${esc(e.message)}</div></div>`; }
  }
  if (owLines.length && !['data', 'team'].includes(p.id)) html = `<div class="notice"><b>One-off warranty excluded:</b> ${owLines.length} REN_EX_SRV line${owLines.length > 1 ? 's' : ''} of EGP ${fmtInt(Number(A.cfg.owThreshold) || 50000)} or more, worth ${egp(owLines.reduce((t, e) => t + e.net, 0))}, are left out of revenue. The list is in Data &amp; imports.</div>` + html;
  $('content').innerHTML = html;
  bindDrops();
}

/* ======================= import workflow ======================= */
async function sha256(buf) { try { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { return 'n' + buf.byteLength + '-' + hashStr(String(new Uint8Array(buf.slice(0, 4096)))); } }
const okExt = n => /\.(xlsx|xls|xlsm|csv)$/i.test(n) && !/(^|\/)~\$/.test(n) && !/__MACOSX/.test(n);
async function expandFiles(fileList, source) {
  const out = [];
  for (const f of fileList) {
    const path = f.webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) {
      await loadScript(LIB.jszip);
      const zip = await window.JSZip.loadAsync(await f.arrayBuffer());
      for (const [p, ent] of Object.entries(zip.files)) { if (ent.dir || !okExt(p)) continue; out.push({ name: p.split('/').pop(), path: f.name + ' › ' + p, source: 'zip', bytes: await ent.async('arraybuffer') }); }
    } else if (okExt(f.name)) out.push({ name: f.name, path, source, bytes: await f.arrayBuffer() });
  }
  return out;
}
function docIdFor(res, hash) { if (res.kind === 'txn') return 'txn-' + res.period; if (res.kind === 'target') return 'target-' + res.period; return 'schedule-' + hash.slice(0, 16); }
/* Excel files are read in background workers, several at once, so the page stays responsive.
   If the browser does not allow workers here, the files are read on the page as before. */
const XL_OPT = { type: 'array', dense: true, cellText: false, cellHTML: false, cellFormula: false, cellStyles: false, cellNF: false };
let xlWorkerUrl = null, xlWorkersOk = null;
function xlWorkerSource() {
  if (xlWorkerUrl) return xlWorkerUrl;
  const core = document.getElementById('core-src');
  if (!core || typeof Worker === 'undefined' || typeof Blob === 'undefined' || !URL.createObjectURL) return null;
  const src = `self.window = self;\nimportScripts(${JSON.stringify(new URL(LIB.xlsx, location.href).href)});\n${core.textContent}\n` +
    `self.onmessage = function (e) { var d = e.data; try { var wb = XLSX.read(new Uint8Array(d.bytes), ${JSON.stringify(XL_OPT)}); postMessage({ id: d.id, res: CORE.analyzeWorkbook(XLSX, wb, d.name) }); } catch (err) { postMessage({ id: d.id, res: { ok: false, error: 'Could not open the file: ' + ((err && err.message) || err) } }); } };`;
  xlWorkerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  return xlWorkerUrl;
}
function readWorkbookHere(it) {
  try { const wb = window.XLSX.read(new Uint8Array(it.bytes), XL_OPT); return C.analyzeWorkbook(window.XLSX, wb, it.name); }
  catch (e) { return { ok: false, error: 'Could not open the file: ' + (e.message || e) }; }
}
async function readWorkbooks(items, progress) {
  const out = new Array(items.length);
  const url = xlWorkersOk === false ? null : (() => { try { return xlWorkerSource(); } catch (e) { return null; } })();
  if (url) {
    const cores = (navigator.hardwareConcurrency || 2);
    const nW = Math.max(1, Math.min(items.length, 4, cores > 2 ? cores - 1 : cores));
    const ws = [];
    try {
      await new Promise((resolve, reject) => {
        let next = 0, done = 0, quiet = null;
        const arm = () => { clearTimeout(quiet); quiet = setTimeout(() => reject(new Error('no answer from the background reader')), 240000); };
        const feed = w => { if (next >= items.length) return; const k = next++; w.postMessage({ id: k, name: items[k].name, bytes: items[k].bytes }); };
        for (let i = 0; i < nW; i++) {
          const w = new Worker(url); ws.push(w);
          w.onmessage = e => { arm(); out[e.data.id] = e.data.res; done++; progress(done); if (done === items.length) { clearTimeout(quiet); resolve(); } else feed(w); };
          w.onerror = e => { if (e && e.preventDefault) e.preventDefault(); clearTimeout(quiet); reject(new Error((e && e.message) || 'background reader failed')); };
          feed(w);
        }
        arm();
      });
      xlWorkersOk = true;
      return out;
    } catch (e) {
      xlWorkersOk = false; console.warn('Reading on the page instead:', e && e.message);
      for (let k = 0; k < out.length; k++) if (out[k] && !out[k].ok && /Could not open/.test(out[k].error || '')) out[k] = undefined;
    } finally { ws.forEach(w => { try { w.terminate(); } catch (e) {} }); }
  }
  if (!window.XLSX) await loadScript(LIB.xlsx);
  for (let k = 0; k < items.length; k++) { if (out[k]) continue; progress(k, items[k].name); await yieldUI(); out[k] = readWorkbookHere(items[k]); }
  return out;
}
async function stageFiles(items, hint, replaceId) {
  if (!items.length) { toast('No Excel, CSV or zip files were found in that selection.', true); return; }
  setBusy(`Reading ${items.length} file${items.length > 1 ? 's' : ''}`, 0);
  let results;
  try { results = await readWorkbooks(items, (done, name) => setBusy(name ? `Reading ${name} (${done + 1} of ${items.length})` : `Reading files (${done} of ${items.length} done)`, (name ? done : done) / items.length)); }
  catch (e) { setBusy(null); toast('The Excel reader could not be loaded. Check the internet connection and try again.', true); return; }
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    const res = results[k];
    const hash = await sha256(it.bytes);
    const x = { key: hash + k, name: it.name, path: it.path, source: it.source, hint, res, hash, size: it.bytes.byteLength, driveId: it.driveId || null, driveModified: it.driveModified || null };
    if (res.ok) {
      const id = docIdFor(res, hash); x.id = id;
      const existing = A.imports.find(d => d.id === id) || (replaceId ? A.imports.find(d => d.id === replaceId) : null);
      if (replaceId && replaceId !== id) x.note = `Uploaded as a replacement for ${replaceId}, but the content is ${id}.`;
      if (existing) { x.conflict = existing; x.dup = existing.hash === hash; x.action = x.dup ? 'skip' : 'replace';
        if (x.dup && res.kind === 'target' && res.ext && res.ext.totalSales && !(existing.ext && existing.ext.totalSales)) { x.action = 'replace'; x.note = 'Same file as the saved one; it is re-imported only to add the “4- Total Renault — Total Sales” line (table 18.2).'; }
      } else x.action = 'import';
      const sameStaged = A.staging.find(s => s.id === id && s.hash !== hash); if (sameStaged) { sameStaged.action = 'skip'; }
      if (A.staging.some(s => s.hash === hash)) x.action = 'skip';
      if (res.kind === 'txn') {
        x.unknownPlants = res.asset.dicts.plant.filter(p => !C.resolvePlant(p, A.cfg).branch);
        x.overlap = overlapCount(res, id);
      }
    } else x.action = 'skip';
    A.staging.push(x);
  }
  setBusy(null);
  if (PAGES[A.page].id !== 'data') A.page = PAGES.findIndex(p => p.id === 'data');
  render();
  const r = $('review'); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function overlapCount(res, id) {
  const S = A.S; if (!S || !S.n) return 0;
  const months = new Set(Object.keys(res.stats.months).map(C.ymFromStr));
  const keys = new Set();
  for (let i = 0; i < S.n; i++) { if (!months.has(S.ym[i]) || S.srcIds[S.src[i]] === id) continue; const rk = S.roKeys[S.ro[i]]; keys.add(S.day[i] + '|' + rk.slice(rk.indexOf('|') + 1) + '|' + S.net[i].toFixed(2)); }
  if (!keys.size) return 0;
  const D = res.asset.dicts; let n = 0;
  for (const r of res.asset.rows) if (keys.has(r[0] + '|' + r[3] + '|' + Number(r[11]).toFixed(2))) n++;
  return n;
}
async function saveStaging() {
  const items = A.staging.filter(x => x.action === 'import' || x.action === 'replace');
  if (!items.length) return;
  let ok = 0;
  for (let k = 0; k < items.length; k++) {
    const x = items[k], r = x.res;
    setBusy(`Saving ${x.name} (${k + 1} of ${items.length})`, k / items.length);
    try {
      const base = { kind: r.kind, fileName: x.name, path: x.path || '', hash: x.hash, size: x.size, source: x.source || 'upload', driveId: x.driveId, driveModified: x.driveModified, uploadedAt: Date.now(), uploadedBy: A.myId || null, uploadedByName: (A.me && A.me.name) || '' };
      let doc;
      if (r.kind === 'txn') {
        const assetIds = [], local = {};
        const chunks = chunkAsset(r.asset);
        for (const ch of chunks) {
          const json = JSON.stringify(ch);
          if (A.local) { const id = 'local-' + x.hash.slice(0, 10) + '-' + assetIds.length; local[id] = ch; assetIds.push(id); }
          else { if (!A.caps.assets) throw new Error('File storage is available to editors only.'); const up = await A.caps.assets.upload(new Blob([json], { type: 'application/json' })); assetIds.push(up.id); A.assetCache.set(up.id, ch); IDB.set(up.id, ch); }
        }
        const st = r.stats, months = {}; for (const [m, v] of Object.entries(st.months)) months[m] = { lines: v.lines, net: Math.round(v.net * 100) / 100, disc: Math.round(v.disc * 100) / 100 };
        doc = Object.assign(base, { period: r.period, months, assetIds, stats: { lines: st.lines, net: st.net, storedNet: st.storedNet, disc: st.disc, invalidDate: st.invalidDate, invalidDateNet: Math.round(st.invalidDateNet * 100) / 100, missingVin: st.missingVin, missingOrder: st.missingOrder, identicalLines: st.identicalLines, groups: st.groups, minDay: st.minDay, maxDay: st.maxDay, discLines: st.discLines, dateFixes: st.dateFixes || 0, dateFixList: (st.dateFixList || []).slice(0, 60) }, header: r.header.slice(0, 40), issues: (r.asset.issues || []).slice(0, 100) });
        if (A.local) doc._local = local;
      } else if (r.kind === 'target') doc = Object.assign(base, { period: r.period, wd: r.wd ?? null, elapsed: r.elapsed ?? null, reportDate: r.reportDate ?? null, entries: r.entries, ext: r.ext || null, warnings: r.warnings || [] });
      else doc = Object.assign(base, { models: r.models });
      const old = A.imports.find(d => d.id === x.id);
      if (A.local) { A.imports = A.imports.filter(d => d.id !== x.id).concat([Object.assign({ id: x.id }, doc)]); }
      else await A.caps.db.collection('imports').doc(x.id).set(JSON.parse(JSON.stringify(doc)));
      if (old && old.assetIds && !A.local) for (const aid of old.assetIds) { if (!doc.assetIds || !doc.assetIds.includes(aid)) { try { await A.caps.assets.delete(aid); } catch (e) {} A.assetCache.delete(aid); } }
      await audit(old ? 'Replaced file' : 'Imported file', `${r.kind === 'txn' ? 'Transactions' : r.kind === 'target' ? 'Target' : 'Schedule'} ${r.period || ''} · ${x.name}${r.kind === 'txn' ? ` · ${r.stats.lines} lines · EGP ${Math.round(r.stats.net).toLocaleString('en-US')}` : ''}`);
      x.saved = true; ok++;
    } catch (e) { x.error = e.message || String(e.code || e); x.res = Object.assign({}, x.res, { ok: false, error: 'Save failed: ' + x.error }); x.action = 'skip'; }
  }
  setBusy(null);
  A.staging = A.staging.filter(x => !x.saved); A.stagingConfirm = false;
  toast(`${ok} file(s) saved${A.local ? ' to this session' : ' to cloud storage'}.` + (A.staging.length ? ` ${A.staging.length} left in review.` : ''));
  if (A.local) scheduleRebuild(); else render();
}
function chunkAsset(a) {
  const json = JSON.stringify(a); if (json.length < 15e6) return [a];
  const parts = Math.ceil(json.length / 12e6), per = Math.ceil(a.rows.length / parts), out = [];
  for (let i = 0; i < a.rows.length; i += per) out.push(Object.assign({}, a, { rows: a.rows.slice(i, i + per), parts: i ? [] : a.parts, issues: i ? [] : a.issues, jobCount: i ? a.jobs.map(() => 0) : a.jobCount }));
  return out;
}
async function deleteImport(id) {
  const d = A.imports.find(x => x.id === id); if (!d) return;
  setBusy('Deleting ' + (d.fileName || id));
  try {
    if (A.local) A.imports = A.imports.filter(x => x.id !== id);
    else { await A.caps.db.collection('imports').doc(id).delete(); for (const aid of d.assetIds || []) { try { await A.caps.assets.delete(aid); } catch (e) {} A.assetCache.delete(aid); } }
    await audit('Deleted file', `${d.kind} ${d.period || ''} · ${d.fileName}`);
    toast('Deleted ' + (d.fileName || id));
  } catch (e) { toast('Could not delete: ' + (e.message || e.code), true); }
  setBusy(null); A.confirmDel = null;
  if (A.local) scheduleRebuild(); else render();
}
async function saveTargetEdit(id) {
  const d = A.imports.find(x => x.id === id); if (!d) return;
  const entries = (d.entries || []).map((e, i) => { const b = $('te-b-' + i).value, a = $('te-a-' + i).value; return Object.assign({}, e, { budget: b === '' ? null : Number(b), actual: a === '' ? null : Number(a) }); });
  const wd = $('te-wd').value === '' ? null : Number($('te-wd').value), el = $('te-el').value === '' ? null : Number($('te-el').value);
  const changed = entries.filter((e, i) => e.budget !== d.entries[i].budget || e.actual !== d.entries[i].actual).map(e => e.raw);
  const patch = { entries, wd, elapsed: el, editedAt: Date.now(), editedBy: A.myId || null };
  try {
    if (A.local) Object.assign(d, patch); else await A.caps.db.collection('imports').doc(id).update(JSON.parse(JSON.stringify(patch)));
    await audit('Edited target', `${d.period}: ${changed.length ? changed.join(', ') : 'no value changes'}${wd !== d.wd ? ` · working days ${d.wd} → ${wd}` : ''}`);
    toast('Target saved'); A.editTarget = null;
  } catch (e) { toast('Could not save: ' + (e.message || e.code), true); }
  if (A.local) scheduleRebuild(); else render();
}

/* Google Drive (read-only through the viewer's connector) */
const GSHEET = 'application/vnd.google-apps.spreadsheet', XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
async function driveCall(tool, input) { const r = await A.caps.mcp.callTool('Google Drive', tool, input, { cache: false }); let p = r.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) {} } return p || {}; }
async function driveList(folderId, path, hint, out, depth) {
  if (depth > 4) return;
  let token, pages = 0;
  do {
    const p = await driveCall('search_files', Object.assign({ query: `parentId = '${folderId.replace(/'/g, '')}'`, pageSize: 100, excludeContentSnippets: true }, token ? { pageToken: token } : {}));
    const files = p.files || [];
    for (const f of files) {
      if (f.mimeType === 'application/vnd.google-apps.folder') await driveList(f.id, path + ' / ' + f.title, hint, out, depth + 1);
      else if (f.mimeType === GSHEET || f.mimeType === XLSX_MIME || /\.(xlsx|xls|xlsm)$/i.test(f.title || '')) out.push({ id: f.id, title: f.title, mimeType: f.mimeType, modifiedTime: f.modifiedTime, path, hint });
    }
    token = files.length ? p.nextPageToken : null; pages++;
  } while (token && pages < 20);
}
async function driveCheck() {
  const ids = { txn: $('drv-txn').value.trim(), targets: $('drv-tg').value.trim(), schedules: $('drv-sc').value.trim() };
  if (JSON.stringify(ids) !== JSON.stringify({ txn: A.cfg.drive.txn, targets: A.cfg.drive.targets, schedules: A.cfg.drive.schedules || '' })) saveConfig({ drive: ids }, 'Google Drive folder IDs');
  A.drive = { list: null, busy: true, err: '' }; render();
  try {
    const out = [];
    if (ids.txn) await driveList(ids.txn, 'DSR achieved', 'txn', out, 0);
    if (ids.targets) await driveList(ids.targets, 'Target', 'target', out, 0);
    if (ids.schedules) await driveList(ids.schedules, 'Schedules', 'schedule', out, 0);
    for (const f of out) { const prev = A.imports.find(d => d.driveId === f.id); f.state = !prev ? 'new' : prev.driveModified !== f.modifiedTime ? 'changed' : 'same'; f.pick = f.state !== 'same'; }
    A.drive.list = out;
  } catch (e) { A.drive.err = e && e.code === 'consent_required' ? 'Allow Google Drive access for this page when prompted, then check again.' : 'Google Drive check failed: ' + (e.message || e.code || e); }
  A.drive.busy = false; render();
}
async function driveFetch() {
  const pick = (A.drive.list || []).filter(x => x.pick); if (!pick.length) return;
  A.drive.busy = true; render();
  const items = [];
  try {
    for (let k = 0; k < pick.length; k++) {
      const f = pick[k];
      setBusy(`Downloading ${f.title} from Google Drive (${k + 1} of ${pick.length})`, k / pick.length);
      const p = await driveCall('download_file_content', Object.assign({ fileId: f.id }, f.mimeType === GSHEET ? { exportMimeType: XLSX_MIME } : {}));
      if (!p.content) throw new Error(`No file content returned for ${f.title}.`);
      const bin = atob(p.content), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      items.push({ name: f.title + (f.mimeType === GSHEET ? '.xlsx' : ''), path: f.path, source: 'drive', bytes: bytes.buffer, driveId: f.id, driveModified: f.modifiedTime });
    }
  } catch (e) { A.drive.err = 'Download stopped: ' + (e.message || e.code || e); }
  setBusy(null); A.drive.busy = false;
  if (items.length) await stageFiles(items, 'drive'); else render();
}

/* ======================= exports ======================= */
function deckData() {
  const S = A.S, s = A.f.s, e = A.f.e, cur = cstats(s, e), py = cstats(s - 100, e - 100), hasPY = py.sm.lines > 0;
  const yA = Math.floor(e / 100), yB = yA - 1;
  const period = s === e ? ymLbl(s) : `${ymLbl(s)} – ${ymLbl(e)}`;
  const slides = [];
  const fmtD = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? `${a >= b ? '+' : ''}${((a - b) / Math.abs(b) * 100).toFixed(1)}%` : 'n/a');
  slides.push({ kind: 'cover', title: 'After-Sales Performance Review', sub: `${period} · ${scopeText()}`, lines: [`Comparison basis: same months of ${yB}${hasPY ? '' : ' (no prior-year data loaded)'}`, `Data to ${dayLbl(S.maxDay)} · revenue = signed net invoiced (EGP)`, `Generated ${tsLbl(Date.now())} from Renault Egypt After-Sales Performance Studio`] });
  slides.push({ title: 'Agenda', blocks: [{ type: 'list', items: ['Headline figures vs prior year', 'Achievement and target', 'Revenue by payer', 'Revenue per repair order', 'Revenue per working and calendar day', 'Discounts — total and by branch', 'Weekly billing trend', 'Revenue and entries by model', 'Service advisors'] }] });
  const hl = [['Revenue', cur.sm.rev, py.sm.rev, egpC], ['Car entries', cur.sm.entries, py.sm.entries, fmtInt], ['Unique vehicles', cur.sm.vins, py.sm.vins, fmtInt], ['Revenue per RO', cur.sm.revPerRo, py.sm.revPerRo, egpC], ['Discount rate', cur.sm.rate, py.sm.rate, pct], ['Periodic-maintenance ROs', cur.sm.perRos, py.sm.perRos, fmtInt]];
  slides.push({ title: 'Headline figures', sub: `${period} vs same months ${yB}`, blocks: [{ type: 'compare', items: hl.map(h => ({ label: h[0], a: h[3](h[1]), b: hasPY ? h[3](h[2]) : 'n/a', la: String(yA), lb: String(yB), d: hasPY ? (h[0] === 'Discount rate' ? `${((h[1] - h[2]) * 100 >= 0 ? '+' : '')}${((h[1] - h[2]) * 100).toFixed(1)} pp` : fmtD(h[1], h[2])) : 'n/a' })) }] });
  const ach = cur.ach, ar = ach.rows.filter(r => r.target > 0).sort((a, b) => b.ach - a.ach);
  slides.push({ title: 'Achievement and target', sub: `Network ${achPct(ach.ach)} of ${egpC(ach.target)} target`, blocks: [{ type: 'bars', labels: ar.map(r => r.unit), values: ar.map(r => C.roundPct(r.ach)), fmt: 'pct100', ref: 100 }, { type: 'table', head: ['Unit', 'Target', 'Revenue', 'Ach.'], rows: ar.map(r => [r.unit, compact(r.target), compact(r.rev), achPct(r.ach)]).concat([['Total', compact(ach.target), compact(ach.revenue), achPct(ach.ach)]]) }] });
  const payN = ['Customer-pay', 'Warranty', 'PDI'];
  slides.push({ title: 'Revenue by payer', sub: `${period} vs ${yB}`, blocks: [{ type: 'bars', labels: payN, values: cur.sm.payer, fmt: 'money', series2: hasPY ? py.sm.payer : null, names: [String(yA), String(yB)] }, { type: 'table', head: ['Payer', String(yA), 'Share', String(yB), 'Change'], rows: payN.map((n, i) => [n, egpC(cur.sm.payer[i]), pct(cur.sm.payer[i] / cur.sm.rev), hasPY ? egpC(py.sm.payer[i]) : 'n/a', hasPY ? fmtD(cur.sm.payer[i], py.sm.payer[i]) : 'n/a']) }] });
  const byB = C.groupBy(S, cur.idx, i => S.br[i]), byBp = C.groupBy(S, py.idx, i => S.br[i]);
  const brs = [...byB].map(([bi, ix]) => ({ name: S.branches[bi], sm: C.summarize(S, ix), pm: byBp.has(bi) ? C.summarize(S, byBp.get(bi)) : null })).sort((a, b) => b.sm.revPerRo - a.sm.revPerRo);
  slides.push({ title: 'Revenue per repair order', sub: `Network ${egpC(cur.sm.revPerRo)} per RO${hasPY ? ` (${yB}: ${egpC(py.sm.revPerRo)})` : ''}`, blocks: [{ type: 'bars', labels: brs.map(b => b.name), values: brs.map(b => b.sm.revPerRo), fmt: 'money' }, { type: 'table', head: ['Branch', 'ROs', 'Rev/RO', yB + ' Rev/RO', 'Change'], rows: brs.map(b => [b.name, fmtInt(b.sm.ros), egpC(b.sm.revPerRo), b.pm ? egpC(b.pm.revPerRo) : 'n/a', b.pm ? fmtD(b.sm.revPerRo, b.pm.revPerRo) : 'n/a']) }] });
  const mrows = []; for (let m = s; m <= e; m = C.ymAdd(m, 1)) { const a = cstats(m, m), b = cstats(m - 100, m - 100); mrows.push([ymLbl(m), egpC(a.sm.rev), Number.isFinite(a.days.wd) ? String(a.days.wd) : 'n/a', egpC(a.revWd), b.sm.lines ? egpC(b.revWd) : 'n/a', b.sm.lines ? fmtD(a.revWd, b.revWd) : 'n/a', egpC(a.revCd), b.sm.lines ? fmtD(a.revCd, b.revCd) : 'n/a']); }
  slides.push({ title: 'Revenue change per working and calendar day', sub: `Working days from target reports${cur.days.missing.length ? ` · missing for ${cur.days.missing.map(ymLbl).join(', ')}` : ''}`, blocks: [{ type: 'table', full: true, head: ['Month', 'Revenue', 'WD', 'Rev/WD', yB + ' Rev/WD', 'Change', 'Rev/CD', 'Change CD'], rows: mrows }] });
  const dB = brs.slice().sort((a, b) => b.sm.disc - a.sm.disc);
  slides.push({ title: 'Discounts — total and by branch', sub: `${egpC(cur.sm.disc)} · rate ${pct(cur.sm.rate)}${hasPY ? ` (${yB}: ${pct(py.sm.rate)})` : ''} · ${fmtInt(cur.sm.discRos)} discounted ROs`, blocks: [{ type: 'bars', labels: dB.map(b => b.name), values: dB.map(b => b.sm.disc), fmt: 'money' }, { type: 'table', head: ['Branch', 'Discount', 'Rate', yB + ' rate', 'Disc. ROs'], rows: dB.map(b => [b.name, egpC(b.sm.disc), pct(b.sm.rate), b.pm ? pct(b.pm.rate) : 'n/a', fmtInt(b.sm.discRos)]) }] });
  const wk = new Map(); for (const i of cur.idx) { const d = C.intToDate(S.day[i]); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); const k = C.dateToInt(d); wk.set(k, (wk.get(k) || 0) + S.net[i]); }
  const wks = [...wk.keys()].sort((a, b) => a - b);
  slides.push({ title: 'Weekly billing trend', sub: 'Revenue by billing week (weeks start Sunday)', blocks: [{ type: 'line', full: true, labels: wks.map(k => `${k % 100} ${MON[Math.floor(k / 100) % 100 - 1]}`), values: wks.map(k => wk.get(k)), fmt: 'money' }] });
  const byM = C.groupBy(S, cur.idx, i => S.model[i]);
  const mods = [...byM].map(([mi, ix]) => ({ name: S.models[mi], sm: C.summarize(S, ix) })).sort((a, b) => b.sm.rev - a.sm.rev).slice(0, 10);
  slides.push({ title: 'Revenue and entries by model', sub: 'Top 10 models by revenue', blocks: [{ type: 'bars', labels: mods.map(m => m.name), values: mods.map(m => m.sm.rev), fmt: 'money' }, { type: 'table', head: ['Model', 'Revenue', 'Entries', 'Vehicles', 'Rev/RO'], rows: mods.map(m => [m.name, egpC(m.sm.rev), fmtInt(m.sm.entries), fmtInt(m.sm.vins), egpC(m.sm.revPerRo)]) }] });
  const idxNP = Array.from(cur.idx).filter(i => S.act[i] !== 2);
  const byA = C.groupBy(S, idxNP, i => S.adv[i] * 4 + S.act[i]);
  const advs = [...byA].map(([k, ix]) => ({ name: S.advs[Math.floor(k / 4)] + ' · ' + ACT_NAMES[k % 4], sm: C.summarize(S, ix) })).sort((a, b) => b.sm.rev - a.sm.rev).slice(0, 12);
  slides.push({ title: 'Service advisors', sub: 'Top 12 by revenue · EM and BS separate', blocks: [{ type: 'table', full: true, head: ['Advisor', 'Revenue', 'ROs', 'Rev/RO', 'Disc. rate', 'Periodic ROs'], rows: advs.map(a => [a.name, egpC(a.sm.rev), fmtInt(a.sm.ros), egpC(a.sm.revPerRo), pct(a.sm.rate), fmtInt(a.sm.perRos)]) }] });
  slides.push({ kind: 'end', title: 'Thank you', sub: 'Questions and discussion' });
  return { slides, period, fileBase: `After-Sales Review ${period.replace(/[^\w\- ]+/g, '').trim()}` };
}
function trendsData() {
  const S = A.S, g = A.f.group, f = Object.assign(F(), { branches: curSet(true) });
  const idx = C.select(S, f), sr = C.series(S, idx, f, g, A.mode === 'compare', A.coverage);
  const period = `${ymLbl(A.f.s)} – ${ymLbl(A.f.e)}`;
  const buckets = sr.info.map(i => i.bucket), groups = [...new Set(sr.points.map(p => p.branch))];
  const blocks = k => groups.map(gn => ({ name: gn, values: buckets.map(b => { const p = sr.points.find(x => x.bucket === b && x.branch === gn); return p && p.hasData ? (k === 'rate' ? (Number.isFinite(p.rate) ? p.rate : null) : p[k]) : null; }) }));
  const slides = [{ kind: 'cover', title: 'Revenue & Discount Trends', sub: `${period} · grouped by ${g} · ${A.mode === 'compare' ? 'branches compared' : 'branches combined'}`, lines: [`Branches: ${f.branches ? [...f.branches].map(i => S.branches[i]).join(', ') : 'all permitted'}`, `Activities: ${A.f.act === 'all' ? 'EM + BS + PDI' : A.f.act}`, 'Custom trends view — not the standard 12-slide deck'] }];
  for (const [k, t, fmt] of [['rev', 'Revenue trend — EGP', 'money'], ['disc', 'Discount value trend — EGP', 'money'], ['rate', 'Discount rate trend — %', 'pct']]) {
    const ser = blocks(k);
    slides.push({ title: t, sub: period, blocks: [{ type: 'line', full: true, labels: buckets, multi: ser, fmt }, { type: 'table', full: true, head: ['Period'].concat(groups), rows: buckets.map((b, bi) => [b + (sr.info[bi].status === 'partial' ? ' (partial)' : sr.info[bi].status === 'missing' ? ' (no data)' : '')].concat(ser.map(se => se.values[bi] == null ? '—' : k === 'rate' ? pct(se.values[bi]) : egpC(se.values[bi])))) }] });
  }
  return { slides, period, fileBase: `Trends ${period.replace(/[^\w\- ]+/g, '').trim()}` };
}
const HEX = { blue: '1E22AA', mag: 'BB28BB', yellow: 'EFDF00', amber: 'FFCC33', grey: '888B8D', dark: '171717' };
async function saveFile(name, data) {
  const dl = A.caps.downloads;
  if (!dl) { toast('File downloads are not available in this view.', true); return; }
  try { await dl.save({ filename: name, data }); toast('Saved ' + name); }
  catch (e) { if (e && e.code === 'declined') return; toast('Could not save the file: ' + (e.message || e.code), true); }
}
async function exportPptx(spec) {
  setBusy('Building PowerPoint');
  try {
    await loadScript(LIB.pptx);
    const P = new window.PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.title = spec.fileBase; P.theme = { headFontFace: 'Google Sans', bodyFontFace: 'Google Sans' };
    spec.slides.forEach((sl, n) => {
      const s = P.addSlide();
      if (sl.kind === 'cover' || sl.kind === 'end') {
        s.background = { color: HEX.dark };
        s.addShape(P.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: HEX.yellow } });
        s.addText('RENAULT  ·  AFTER-SALES', { x: 0.8, y: 0.7, w: 11, h: 0.4, fontSize: 12, color: 'BBBCBC', bold: true, charSpacing: 4 });
        s.addText(sl.title, { x: 0.8, y: 2.2, w: 11.5, h: 1.2, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Google Sans' });
        s.addText(sl.sub || '', { x: 0.8, y: 3.4, w: 11.5, h: 0.6, fontSize: 18, color: HEX.yellow });
        if (sl.lines) s.addText(sl.lines.map(t => ({ text: t, options: { breakLine: true } })), { x: 0.8, y: 4.6, w: 11.5, h: 1.6, fontSize: 13, color: 'D9D9D6' });
        return;
      }
      s.background = { color: 'FFFFFF' };
      s.addShape(P.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: HEX.yellow } });
      s.addText(sl.title, { x: 0.5, y: 0.3, w: 10.5, h: 0.6, fontSize: 24, bold: true, color: HEX.dark, fontFace: 'Google Sans' });
      if (sl.sub) s.addText(sl.sub, { x: 0.5, y: 0.85, w: 12, h: 0.4, fontSize: 12, color: '646B72' });
      s.addText(`${n + 1}`, { x: 12.3, y: 7.0, w: 0.6, h: 0.3, fontSize: 9, color: HEX.grey, align: 'right' });
      s.addText(`${spec.period} · Renault Egypt After-Sales Performance Studio`, { x: 0.5, y: 7.0, w: 9, h: 0.3, fontSize: 9, color: HEX.grey });
      const blocks = sl.blocks || []; const two = blocks.length === 2 && !blocks[0].full && !blocks[1].full;
      blocks.forEach((b, bi) => {
        const box = two ? { x: bi === 0 ? 0.5 : 6.95, y: 1.45, w: 5.9, h: 5.4 } : { x: 0.5, y: 1.45 + (bi && !two ? 3.1 : 0), w: 12.3, h: blocks.length > 1 ? 2.9 : 5.4 };
        if (b.type === 'list') s.addText(b.items.map((t, i) => ({ text: `${String(i + 1).padStart(2, '0')}   ${t}`, options: { breakLine: true } })), { x: 0.8, y: 1.6, w: 11, h: 5, fontSize: 18, color: HEX.dark, paraSpaceAfter: 8 });
        else if (b.type === 'compare') {
          b.items.forEach((it, i) => {
            const cx = 0.5 + (i % 3) * 4.15, cy = 1.55 + Math.floor(i / 3) * 2.65;
            s.addShape(P.ShapeType.rect, { x: cx, y: cy, w: 3.95, h: 2.45, fill: { color: 'F6F7F8' }, line: { color: 'E3E5E8' } });
            s.addShape(P.ShapeType.rect, { x: cx, y: cy, w: 3.95, h: 0.07, fill: { color: [HEX.yellow, HEX.blue, HEX.mag][i % 3] } });
            s.addText(it.label, { x: cx + 0.2, y: cy + 0.15, w: 3.6, h: 0.4, fontSize: 13, bold: true, color: '646B72' });
            s.addText([{ text: it.la + '\n', options: { fontSize: 10, color: '646B72' } }, { text: it.a, options: { fontSize: 22, bold: true, color: HEX.dark } }], { x: cx + 0.2, y: cy + 0.6, w: 1.85, h: 1.1, valign: 'top' });
            s.addText([{ text: it.lb + '\n', options: { fontSize: 10, color: '646B72' } }, { text: it.b, options: { fontSize: 22, bold: true, color: HEX.grey } }], { x: cx + 2.05, y: cy + 0.6, w: 1.8, h: 1.1, valign: 'top' });
            s.addText(`Change: ${it.d}`, { x: cx + 0.2, y: cy + 1.85, w: 3.6, h: 0.4, fontSize: 12, bold: true, color: /^\+/.test(it.d) ? '1D7A4D' : /^-/.test(it.d) ? 'B3261E' : '646B72' });
          });
        } else if (b.type === 'table') {
          const rows = [b.head.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: HEX.dark } } }))].concat(b.rows.slice(0, 16).map(r => r.map((c, ci) => ({ text: String(c), options: { align: ci ? 'right' : 'left' } }))));
          s.addTable(rows, { x: box.x, y: box.y, w: box.w, fontSize: b.rows.length > 12 ? 8.5 : 10, border: { type: 'solid', pt: 0.5, color: 'E3E5E8' }, rowH: 0.27, autoPage: false });
        } else if (b.type === 'bars') {
          const data = [{ name: (b.names && b.names[0]) || 'Value', labels: b.labels.slice(0, 15), values: b.values.slice(0, 15).map(v => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0)) }];
          if (b.series2) data.push({ name: b.names[1], labels: b.labels, values: b.series2.map(v => (Number.isFinite(v) ? Math.round(v) : 0)) });
          s.addChart(P.ChartType.bar, data, { x: box.x, y: box.y, w: box.w, h: box.h, barDir: 'bar', chartColors: [HEX.blue, 'BBBCBC'], catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, showValue: true, dataLabelFontSize: 8, dataLabelFormatCode: b.fmt === 'pct100' ? '0.0"%"' : '#,##0', valAxisLabelFormatCode: b.fmt === 'pct100' ? '0"%"' : '#,##0', catAxisOrientation: 'maxMin', showLegend: !!b.series2, legendPos: 'b' });
        } else if (b.type === 'line') {
          const ser = b.multi ? b.multi.map(m => ({ name: m.name, labels: b.labels, values: m.values.map(v => (v == null ? null : b.fmt === 'pct' ? Math.round(v * 10000) / 100 : Math.round(v))) })) : [{ name: 'Revenue', labels: b.labels, values: b.values.map(v => Math.round(v)) }];
          s.addChart(P.ChartType.line, ser, { x: box.x, y: box.y, w: box.w, h: box.h, chartColors: [HEX.blue, HEX.mag, 'C98300', '1F8A74', 'D9475E', '6158C9', '9A5A2E', '0087B0', '5F656B', '8A9C13', 'A052B5'], lineSize: 2, lineDataSymbolSize: 5, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, valAxisLabelFormatCode: b.fmt === 'pct' ? '0.0"%"' : '#,##0', showLegend: ser.length > 1, legendPos: 'b', displayBlanksAs: 'gap', showValue: true, dataLabelPosition: 't', dataLabelFontSize: 7, dataLabelFormatCode: b.fmt === 'pct' ? '0.0"%"' : '#,##0' });
        }
      });
    });
    const blob = await P.write({ outputType: 'blob' });
    setBusy(null);
    await saveFile(spec.fileBase + '.pptx', blob);
  } catch (e) { setBusy(null); toast('PowerPoint export failed: ' + (e.message || e), true); }
}
async function exportPdf(spec) {
  setBusy('Building PDF');
  try {
    await loadScript(LIB.jspdf);
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210; const ink = [23, 23, 23], muted = [100, 107, 114], line = [227, 229, 232], blue = [30, 34, 170];
    const clip = (t, w, fs) => { doc.setFontSize(fs); let s = String(t); while (s.length > 1 && doc.getTextWidth(s) > w) s = s.slice(0, -2) + '…'; return s; };
    spec.slides.forEach((sl, n) => {
      if (n) doc.addPage();
      if (sl.kind === 'cover' || sl.kind === 'end') {
        doc.setFillColor(...ink); doc.rect(0, 0, W, H, 'F'); doc.setFillColor(239, 223, 0); doc.rect(0, 0, 6, H, 'F');
        doc.setTextColor(187, 188, 188); doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('RENAULT  ·  AFTER-SALES', 20, 22);
        doc.setTextColor(255, 255, 255); doc.setFontSize(32); doc.text(sl.title, 20, 80);
        doc.setTextColor(239, 223, 0); doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.text(clip(sl.sub || '', 255, 14), 20, 94);
        doc.setTextColor(217, 217, 214); doc.setFontSize(11); (sl.lines || []).forEach((t, i) => doc.text(clip(t, 255, 11), 20, 118 + i * 8));
        return;
      }
      doc.setFillColor(239, 223, 0); doc.rect(0, 0, W, 3, 'F');
      doc.setTextColor(...ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(sl.title, 14, 17);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...muted); if (sl.sub) doc.text(clip(sl.sub, 265, 10), 14, 24);
      doc.setFontSize(8); doc.text(`${spec.period} · Renault Egypt After-Sales Performance Studio`, 14, 203); doc.text(String(n + 1), W - 14, 203, { align: 'right' });
      const blocks = sl.blocks || []; const two = blocks.length === 2 && !blocks[0].full && !blocks[1].full;
      blocks.forEach((b, bi) => {
        const box = two ? { x: bi === 0 ? 14 : 154, y: 32, w: 129, h: 160 } : { x: 14, y: 32 + (bi ? 86 : 0), w: 269, h: blocks.length > 1 ? 80 : 160 };
        if (b.type === 'list') { doc.setFontSize(14); doc.setTextColor(...ink); b.items.forEach((t, i) => doc.text(`${String(i + 1).padStart(2, '0')}    ${t}`, 22, 44 + i * 14)); }
        else if (b.type === 'compare') {
          b.items.forEach((it, i) => {
            const cx = 14 + (i % 3) * 91, cy = 32 + Math.floor(i / 3) * 80, cw = 86, ch = 74;
            doc.setFillColor(246, 247, 248); doc.setDrawColor(...line); doc.rect(cx, cy, cw, ch, 'FD');
            const col = [[239, 223, 0], blue, [187, 40, 187]][i % 3]; doc.setFillColor(...col); doc.rect(cx, cy, cw, 1.6, 'F');
            doc.setTextColor(...muted); doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text(it.label, cx + 5, cy + 11);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(it.la, cx + 5, cy + 24); doc.text(it.lb, cx + 46, cy + 24);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...ink); doc.text(clip(it.a, 40, 17), cx + 5, cy + 34); doc.setTextColor(136, 139, 141); doc.text(clip(it.b, 38, 17), cx + 46, cy + 34);
            doc.setFontSize(11); doc.setTextColor(...(/^\+/.test(it.d) ? [29, 122, 77] : /^-/.test(it.d) ? [179, 38, 30] : muted)); doc.text('Change: ' + it.d, cx + 5, cy + 60); doc.setFont('helvetica', 'normal');
          });
        } else if (b.type === 'table') {
          const rows = b.rows.slice(0, 22), rh = Math.min(7, (box.h - 8) / (rows.length + 1)), fs = rh < 6 ? 7.5 : 8.5;
          const cw = box.w / b.head.length, firstW = Math.min(box.w * 0.34, cw * 1.8), restW = (box.w - firstW) / Math.max(1, b.head.length - 1);
          const cx = i => (i === 0 ? box.x : box.x + firstW + (i - 1) * restW), wOf = i => (i === 0 ? firstW : restW);
          doc.setFillColor(...ink); doc.rect(box.x, box.y, box.w, rh, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
          b.head.forEach((h, i) => doc.text(clip(h, wOf(i) - 3, fs), i ? cx(i) + wOf(i) - 1.5 : cx(i) + 1.5, box.y + rh * 0.68, { align: i ? 'right' : 'left' }));
          doc.setFont('helvetica', 'normal'); doc.setTextColor(...ink);
          rows.forEach((r, ri) => { const y = box.y + rh * (ri + 1); if (ri % 2) { doc.setFillColor(246, 247, 248); doc.rect(box.x, y, box.w, rh, 'F'); } r.forEach((c, i) => doc.text(clip(c, wOf(i) - 3, fs), i ? cx(i) + wOf(i) - 1.5 : cx(i) + 1.5, y + rh * 0.68, { align: i ? 'right' : 'left' })); });
          doc.setDrawColor(...line); doc.line(box.x, box.y + rh * (rows.length + 1), box.x + box.w, box.y + rh * (rows.length + 1));
        } else if (b.type === 'bars') {
          const labels = b.labels.slice(0, 15), vals = b.values.slice(0, 15).map(v => (Number.isFinite(v) ? v : 0));
          const max = Math.max(...vals, b.ref || 0, 1e-9), lw = 40, bh = Math.min(9, (box.h - 6) / labels.length), aw = box.w - lw - 26;
          labels.forEach((l, i) => { const y = box.y + i * bh; doc.setFontSize(8); doc.setTextColor(...ink); doc.text(clip(l, lw - 2, 8), box.x, y + bh * 0.62); doc.setFillColor(...blue); doc.rect(box.x + lw, y + bh * 0.2, Math.max(0, (vals[i] / max) * aw), bh * 0.6, 'F'); doc.setTextColor(...muted); doc.text(b.fmt === 'pct100' ? vals[i].toFixed(1) + '%' : compact(vals[i]), box.x + lw + Math.max(0, (vals[i] / max) * aw) + 2, y + bh * 0.62); });
          if (b.ref) { const x = box.x + lw + (b.ref / max) * aw; doc.setDrawColor(...ink); doc.setLineWidth(0.4); doc.line(x, box.y, x, box.y + labels.length * bh); doc.setLineWidth(0.2); }
        } else if (b.type === 'line') {
          const ser = b.multi ? b.multi : [{ name: 'Revenue', values: b.values }];
          const all = ser.flatMap(x => x.values).filter(Number.isFinite); if (!all.length) return;
          let mn = Math.min(0, ...all), mx = Math.max(0, ...all); if (mx === mn) mx = mn + 1; const tk = niceTicks(mn, mx, 4); mn = tk[0]; mx = tk[tk.length - 1];
          const L = box.x + 18, R = box.x + box.w - 4, T = box.y + 4, Bm = box.y + box.h - 12, n2 = b.labels.length;
          const xx = i => L + (n2 === 1 ? (R - L) / 2 : (i * (R - L)) / (n2 - 1)), yy = v => T + ((mx - v) / (mx - mn)) * (Bm - T);
          doc.setFontSize(7); tk.forEach(v => { doc.setDrawColor(...line); doc.line(L, yy(v), R, yy(v)); doc.setTextColor(...muted); doc.text(b.fmt === 'pct' ? (v * 100).toFixed(1) + '%' : compact(v), L - 2, yy(v) + 1, { align: 'right' }); });
          const every = Math.ceil(n2 / 14); b.labels.forEach((l, i) => { if (i % every) return; doc.text(clip(l, 22, 7), xx(i), Bm + 6, { align: 'center' }); });
          const cols = [blue, [187, 40, 187], [201, 131, 0], [31, 138, 116], [217, 71, 94], [97, 88, 201], [154, 90, 46], [0, 135, 176], [95, 101, 107], [138, 156, 19], [160, 82, 181]];
          ser.forEach((se, si) => { doc.setDrawColor(...cols[si % cols.length]); doc.setLineWidth(0.6); let prev = null; se.values.forEach((v, i) => { if (!Number.isFinite(v)) { prev = null; return; } const p = [xx(i), yy(v)]; if (prev) doc.line(prev[0], prev[1], p[0], p[1]); doc.setFillColor(...cols[si % cols.length]); doc.circle(p[0], p[1], 0.7, 'F'); doc.setFontSize(n2 > 20 ? 5.5 : 6.5); doc.setTextColor(...cols[si % cols.length]); doc.text(b.fmt === 'pct' ? (v * 100).toFixed(1) + '%' : compact(v), p[0], p[1] - 2, { align: 'center' }); prev = p; }); });
          doc.setLineWidth(0.2);
          if (ser.length > 1) ser.forEach((se, si) => { doc.setFillColor(...cols[si % cols.length]); doc.rect(box.x + 18 + (si % 6) * 44, box.y + box.h + 2 + Math.floor(si / 6) * 4, 3, 3, 'F'); doc.setTextColor(...ink); doc.text(clip(se.name, 38, 7), box.x + 23 + (si % 6) * 44, box.y + box.h + 4.6 + Math.floor(si / 6) * 4); });
        }
      });
    });
    const blob = doc.output('blob');
    setBusy(null);
    await saveFile(spec.fileBase + '.pdf', blob);
  } catch (e) { setBusy(null); toast('PDF export failed: ' + (e.message || e), true); }
}
async function exportFollowupCsv() {
  const fu = C.followUp(A.S, A.schedules, A.cfg, { branches: curSet(false) });
  const list = fu.rows.filter(r => A.fuStatus === 'all' || r.status === A.fuStatus);
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const csv = ['VIN,Model,Branch,Basis,Base date,Last km,Next km,Due date,Due by,Last visit,Status,Schedule'].concat(list.map(r => [r.vin, r.model, r.branch, r.basis, dayLbl(r.base), r.perKm || '', r.nextKm || '', dayLbl(r.due), r.dueBy, dayLbl(r.lastVisit), r.status, r.schedule || ''].map(q).join(','))).join('\n');
  await saveFile(`Service follow-up ${A.fuStatus} ${dayLbl(fu.cutoff)}.csv`, '﻿' + csv);
}

/* ======================= V2: shared helpers ======================= */
const owDefined = () => (A.cfg.owSplits || []).length > 0 || !!A.cfg.owPayerRe || A.cfg.owExSrv !== false;
const compName = { total: 'Total', L: 'Labour', P: 'Parts', O: 'Other' };
function compByBranch(f, comp) {
  const S = A.S, a = C.achievement(S, A.T, f, comp), by = new Map();
  for (const r of a.rows) { const bi = S.unitBranch[r.ui]; const o = by.get(bi) || { rev: 0, target: 0, revAll: 0 }; o.revAll += r.rev + r.revNoTarget; if (r.target > 0) { o.rev += r.rev; o.target += r.target; } by.set(bi, o); }
  return { a, by };
}
function csvSave(name, head, rows) {
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  return saveFile(name, '﻿' + [head.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\n'));
}
/* built-in spare-parts name list (Renault parts catalogue sheet, Nov 2026); names typed or uploaded in the app take priority */
const SP_NAMES = /*SPNAMES*/{};
const SP_COUNT = Object.keys(SP_NAMES).length;
const partName = code => ((A.cfg.partNames || {})[code]) || SP_NAMES[code] || (A.S.partNames && A.S.partNames.get(code)) || '';
const family = code => { const m = String(code).match(/^([A-Z]{1,4})-/); return m ? m[1] : '(other)'; };
const FAMILY_NAMES = { LO: 'LO · lubricants & oils', RN: 'RN · Renault parts', CL: 'CL · CL parts', DA: 'DA · Dacia parts' };

/* ======================= page: parts ======================= */
function revRowsParts(list, byStatus) {
  return hbars(list.map(x => ({ label: x.label, segs: [{ v: x.v, color: byStatus && x.target > 0 ? statusColor(x.rev / x.target) : 'var(--blue)' }], marker: x.target > 0 ? x.target : 0, value: `<b>${egpC(x.v)}</b>`, sub: x.target > 0 ? achLine(x.rev, x.target) : '<span class="mini">No parts budget</span>' })), { aria: 'Parts achievement' });
}
function serviceSettings() {
  const admin = isAdmin(), S = A.S, P = S.P, c = A.cfg;
  const svcMats = new Map(); for (let i = 0; i < P.n; i++) if (P.svc[i]) { const k = S.mats[P.mat[i]]; svcMats.set(k, (svcMats.get(k) || 0) + P.net[i]); }
  const rows = [...svcMats].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([code, v]) => [esc(code), esc(partName(code)), egp(v), S.svcSet.has(code) ? ((c.serviceParts || []).includes(code) ? 'Added by administrator' : 'Schedule file') : (c.servicePartPrefixes || []).some(p => code.startsWith(String(p).toUpperCase())) ? 'Prefix' : 'Periodic job', admin && (c.serviceParts || []).includes(code) ? `<button class="btn small secondary" data-act="svcdel" data-code="${esc(code)}">Remove</button>` : '']);
  return sec('Service-part rules', admin ? 'Changes apply to all saved data immediately.' : 'Read-only for members.', `<div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field wide"><label for="svc-pre">Prefixes counted as service parts (comma separated)</label><input id="svc-pre" class="inp" value="${esc((c.servicePartPrefixes || []).join(', '))}" ${admin ? '' : 'disabled'}></div><div class="field"><label for="svc-add">Add part number</label><input id="svc-add" class="inp" placeholder="RN-152095084R" ${admin ? '' : 'disabled'}></div>${admin ? '<button class="btn" data-act="svcsave">Apply</button>' : ''}</div>
  <div class="choices"><label class="choice"><input type="checkbox" data-act="svcsched" ${c.servicePartsFromSchedules !== false ? 'checked' : ''} ${admin ? '' : 'disabled'}> Part numbers from the maintenance schedule files</label><label class="choice"><input type="checkbox" data-act="svcper" ${c.servicePartsOnPeriodic ? 'checked' : ''} ${admin ? '' : 'disabled'}> Any part billed on a periodic-maintenance job</label></div>` + table(['Service part', 'Name', 'Revenue (all time)', 'Recognised by', ''], rows, { align: ['', '', 'num', '', 'num'], maxH: 360 }));
}

/* ======================= page: labour & appointments ======================= */
function pageLabour() {
  const S = A.S, cur = stats(A.f.s, A.f.e), sm = cur.sm;
  const la = compByBranch(F(), 'L'), oa = compByBranch(F(), 'O'), pa = compByBranch(F(), 'P'), ta = compByBranch(F(), 'total');
  let h = cards([
    { label: 'Labour revenue', value: egpC(sm.labour), note: `${pct(sm.rev ? sm.labour / sm.rev : NaN)} of total revenue` },
    { label: 'Labour achievement', value: achText(la.a.ach), note: Number.isFinite(la.a.ach) ? `${egpC(la.a.revenue)} of ${egpC(la.a.target)} labour budget` : 'No labour budget', t: 't-blue' },
    { label: 'Billed labour hours', value: fmtInt(sm.hours), count: true, note: 'Billed quantity on labour lines', t: 't-mag' },
    { label: 'Effective labour rate', value: egpC(sm.labourRate), note: 'Labour revenue ÷ billed hours', t: 't-dark' },
    { label: 'Hours per car entry', value: Number.isFinite(sm.hoursPerRo) ? sm.hoursPerRo.toFixed(2) : 'N/A', note: `${fmtInt(sm.entries)} car entries` },
    { label: 'Appointment rate', value: pct(sm.apptRate), note: `${fmtInt(sm.apptRos)} appointment vs ${fmtInt(sm.walkRos)} walk-in ROs`, t: 't-blue' },
    { label: 'Other revenue', value: egpC(sm.other), note: `Achievement ${achText(oa.a.ach)} of ${egpC(oa.a.target)}`, t: 't-mag' },
    { label: 'Parts revenue', value: egpC(sm.parts), note: `Achievement ${achText(pa.a.ach)} of ${egpC(pa.a.target)}`, t: 't-amber' },
  ], 'Labour key figures');
  // labour / parts / other achievement by unit table
  const units = new Map();
  for (const [k, comp] of [['L', la], ['P', pa], ['O', oa], ['T', ta]]) for (const r of comp.a.rows) { const u = units.get(r.unit) || {}; u[k] = r; units.set(r.unit, u); }
  const cell = r => (r && r.target > 0 ? `${egpC(r.rev)}<div>${achLine(r.rev, r.target)}</div>` : r ? `${egpC(r.rev + r.revNoTarget)}<div class="mini">No budget</div>` : '—');
  const urows = [...units].sort((a, b) => ((b[1].T || {}).rev || 0) - ((a[1].T || {}).rev || 0)).map(([u, x]) => [esc(u), cell(x.L), cell(x.P), cell(x.O), cell(x.T)]);
  urows.push({ _cls: 'total', cells: ['Total', `${egpC(la.a.revenue)}<div>${achLine(la.a.revenue, la.a.target)}</div>`, `${egpC(pa.a.revenue)}<div>${achLine(pa.a.revenue, pa.a.target)}</div>`, `${egpC(oa.a.revenue)}<div>${achLine(oa.a.revenue, oa.a.target)}</div>`, `${egpC(ta.a.revenue)}<div>${achLine(ta.a.revenue, ta.a.target)}</div>`] });
  h += sec('Labour, parts and other against budget', 'Each unit against the labour, parts and other budgets in the target reports (the same split as the DSR).', table(['Unit', 'Labour', 'Parts', 'Other', 'Total'], urows));
  const brs = [...la.by.keys()].sort((a, b) => la.by.get(b).revAll - la.by.get(a).revAll);
  // labour revenue of each branch split by payer (cash / warranty / PDI), the labour budget as a marker
  const lcw = new Map(); { const NL = S.netL, CW = S.cw, BR = S.br; for (const i of C.select(S, F())) { const b = BR[i]; let o = lcw.get(b); if (!o) { o = [0, 0, 0]; lcw.set(b, o); } const w = CW[i]; o[w === 0 ? 0 : w === 1 ? 1 : 2] += NL[i]; } }
  const anyPdiL = [...lcw.values()].some(o => Math.abs(o[2]) > 0.5);
  h += sec('Labour achievement by branch (Cash and warranty)', 'Each bar is the branch’s labour revenue split into cash and warranty' + (anyPdiL ? ' (PDI in grey)' : '') + '; the black mark is the labour budget. Achievement = labour ÷ labour budget (green ≥ 100%, amber within 10%, red below).', hbars(brs.map(bi => { const t = la.by.get(bi), o = lcw.get(bi) || [0, 0, 0], ach = t.target > 0 ? t.rev / t.target : NaN, tot = o[0] + o[1] + o[2]; return { label: S.branches[bi], segs: [{ v: o[0], color: 'var(--c4)', name: 'Cash' }, { v: o[1], color: 'var(--c5)', name: 'Warranty' }].concat(anyPdiL ? [{ v: o[2], color: 'var(--grey-l)', name: 'PDI' }] : []), marker: t.target, value: `<b>${egpC(t.revAll)}</b>${Number.isFinite(ach) ? ` <span class="ach ${achCls(ach)}">${achPct(ach)}</span>` : ''}`, sub: `cash ${egpC(o[0])} · warranty ${egpC(o[1])} (${pct(tot ? o[1] / tot : NaN)})${t.target > 0 ? ` · budget ${egpC(t.target)}` : ' · no labour budget'}` }; }), { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)']].concat(anyPdiL ? [['PDI', 'var(--grey-l)']] : []).concat([['Labour budget', '#151515']]), aria: 'Labour achievement by branch, cash and warranty' }));
  h += operatingSection('days');
  // hours & rate by branch
  const byB = C.groupBy(S, cur.idx, i => S.br[i]);
  const bRows = [...byB].map(([bi, l]) => ({ name: S.branches[bi], sm: C.summarize(S, l) })).sort((a, b) => b.sm.hours - a.sm.hours);
  h += `<div class="two">${sec('Billed hours by branch', 'With effective labour rate and hours per car entry.', hbars(bRows.map(x => ({ label: x.name, segs: [{ v: x.sm.hours, color: branchColor(x.name) }], value: `<b>${fmtInt(x.sm.hours)} h</b>`, sub: `${egpC(x.sm.labourRate)}/h · ${Number.isFinite(x.sm.hoursPerRo) ? x.sm.hoursPerRo.toFixed(2) : '—'} h per entry` })), { aria: 'Hours by branch' }))}${sec('Appointment rate by branch', 'Appointment ROs ÷ (appointment + walk-in ROs), from the RO Split column.', hbars(bRows.slice().sort((a, b) => (b.sm.apptRate || 0) - (a.sm.apptRate || 0)).map(x => ({ label: x.name, segs: [{ v: Number.isFinite(x.sm.apptRate) ? x.sm.apptRate : 0, color: 'var(--c6)' }], value: `<b>${pct(x.sm.apptRate)}</b>`, sub: `${fmtInt(x.sm.apptRos)} appt · ${fmtInt(x.sm.walkRos)} walk-in` })), { max: 1, aria: 'Appointment rate by branch' }))}</div>`;
  // RO type mix
  const bySplit = C.groupBy(S, cur.idx, i => S.split[i]);
  const sRows = [...bySplit].map(([si, l]) => ({ name: si >= 0 ? S.splits[si] : '(blank)', sm: C.summarize(S, l) })).sort((a, b) => b.sm.rev - a.sm.rev);
  h += sec('Repair-order types', 'From the RO Split column: revenue, ROs and revenue per RO by type.', hbars(sRows.map(x => ({ label: x.name, segs: [{ v: Math.max(0, x.sm.rev), color: 'var(--c8)' }], value: `<b>${egpC(x.sm.rev)}</b>`, sub: `${fmtInt(x.sm.ros)} ROs · ${egpC(x.sm.revPerRo)}/RO` })), { aria: 'RO types' }));
  // advisors
  const advB = C.groupBy(S, Array.from(cur.idx).filter(i => S.act[i] !== 2), i => S.adv[i]);
  const aRows = [...advB].map(([ai, l]) => ({ name: S.advs[ai], sm: C.summarize(S, l) })).sort((a, b) => b.sm.labour - a.sm.labour);
  h += sec('Advisors — labour, hours and appointments', 'PDI excluded.', table(['Advisor', 'Labour', 'Hours', 'Rate / h', 'Hours per entry', 'Parts', 'Parts per RO', 'Appointment rate', 'ROs'], aRows.map(x => [esc(x.name), egp(x.sm.labour), fmtInt(x.sm.hours), egp(x.sm.labourRate), Number.isFinite(x.sm.hoursPerRo) ? x.sm.hoursPerRo.toFixed(2) : '—', egp(x.sm.parts), egp(x.sm.partsPerRo), pct(x.sm.apptRate), fmtInt(x.sm.ros)]), { maxH: 520 }));
  // monthly trend
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  const ms = months.map(m => { const st = stats(m, m); return st.sm.lines ? st.sm : null; });
  h += sec('Labour revenue and hours by month', '', lineChart({ labels: months.map(ymLbl), series: [{ name: 'Labour revenue', color: 'var(--blue)', values: ms.map(x => (x ? x.labour : null)) }], missing: months.map(m => !A.coverage.has(m)), fmt: 'money', aria: 'Labour by month' }) + lineChart({ labels: months.map(ymLbl), series: [{ name: 'Billed hours', color: 'var(--c2)', values: ms.map(x => (x ? x.hours : null)) }, { name: 'Appointment ROs', color: 'var(--c6)', values: ms.map(x => (x ? x.apptRos : null)) }], fmt: 'int', aria: 'Hours by month' }));
  h += revenueLinesSection();
  h += operatingSection('rest');
  h += '<div class="notice">Billed hours come from the Billed Quantity on labour lines. Some flat-rate lines (car wash, for example) carry a quantity that is not hours, so treat the rate as indicative.</div>';
  return h;
}

/* ======================= page: customers & accounts ======================= */
function pageCustomers() {
  const S = A.S, cur = stats(A.f.s, A.f.e), cutoff = S.maxDay, maxYear = Math.floor(cutoff / 10000);
  const br = curSet(false);
  // lost customers (all history, branch filter on last visit branch)
  const last = S._lastVin || (S._lastVin = (() => {
    const m = new Map(), seenRo = new Uint8Array(S.roKeys.length);
    for (let i = 0; i < S.n; i++) {
      const v = S.vin[i]; if (v < 0 || S.act[i] === 2) continue;
      let o = m.get(v); if (!o) { o = { v, day: 0, br: 0, model: 0, adv: 0, visits: { size: 0 }, spend: 0 }; m.set(v, o); }
      o.spend += S.net[i]; const r = S.ro[i]; if (!seenRo[r]) { seenRo[r] = 1; o.visits.size++; }
      if (S.day[i] >= o.day) { o.day = S.day[i]; o.br = S.br[i]; o.model = S.model[i]; o.adv = S.adv[i]; }
    }
    return m;
  })());
  const d9 = C.addMonthsInt(cutoff, -9), d12 = C.addMonthsInt(cutoff, -12), d24 = C.addMonthsInt(cutoff, -24);
  const histMonths = (C.ymOf(cutoff) - C.ymOf(S.minDay)) % 100 + 12 * (Math.floor(C.ymOf(cutoff) / 100) - Math.floor(C.ymOf(S.minDay) / 100)) + 1;
  const lost = [], risk = [];
  for (const o of last.values()) { if (br && !br.has(o.br)) continue; if (o.day <= d12 && o.day > d24) lost.push(o); else if (o.day <= d9 && o.day > d12) risk.push(o); }
  lost.sort((a, b) => b.spend - a.spend); risk.sort((a, b) => b.spend - a.spend);
  A._lostCsv = { lost, risk };
  let h = cards([
    { label: 'Lapsed vehicles', value: fmtInt(lost.length), count: true, note: 'Last visit 12–24 months before the latest data date', t: 't-mag' },
    { label: 'At-risk vehicles', value: fmtInt(risk.length), count: true, note: 'Last visit 9–12 months ago', t: 't-amber' },
    { label: 'Lapsed spend (lifetime in data)', value: egpC(lost.reduce((t, o) => t + o.spend, 0)), note: 'What these vehicles spent while active' },
    { label: 'History loaded', value: `${histMonths} months`, note: histMonths < 12 ? 'At least 12 months are needed to find lapsed vehicles' : `From ${dayLbl(S.minDay)}`, t: 't-dark' },
  ], 'Customer retention figures');
  const lostBy = new Map(); for (const o of lost) lostBy.set(o.br, (lostBy.get(o.br) || 0) + 1);
  const riskBy = new Map(); for (const o of risk) riskBy.set(o.br, (riskBy.get(o.br) || 0) + 1);
  const brs = [...new Set([...lostBy.keys(), ...riskBy.keys()])].sort((a, b) => (lostBy.get(b) || 0) - (lostBy.get(a) || 0));
  h += sec('Lapsed and at-risk vehicles by last branch', 'Vehicles are counted at the branch of their last visit. PDI events are not visits.', hbars(brs.map(bi => ({ label: S.branches[bi], segs: [{ v: lostBy.get(bi) || 0, color: 'var(--c5)', name: 'Lapsed' }, { v: riskBy.get(bi) || 0, color: 'var(--c3)', name: 'At risk' }], value: `<b>${fmtInt((lostBy.get(bi) || 0) + (riskBy.get(bi) || 0))}</b>`, sub: '' })), { legend: [['Lapsed (12–24 mo)', 'var(--c5)'], ['At risk (9–12 mo)', 'var(--c3)']], aria: 'Lapsed vehicles by branch', emptyText: histMonths < 9 ? 'Load at least 9–12 months of history to see lapsed vehicles.' : 'No lapsed vehicles.' }));
  const lrow = o => [`<span style="font-family:ui-monospace,monospace;font-size:11.5px">${esc(S.vins[o.v])}</span>`, esc(S.models[o.model]), esc(S.branches[o.br]), esc(S.advs[o.adv]), dayLbl(o.day), fmtInt(o.visits.size), egp(o.spend)];
  h += sec('Call list — lapsed vehicles', `Top ${Math.min(250, lost.length)} by spend. Download the full list for the call centre.`, `<div style="margin-bottom:10px">${A.caps.downloads ? `<button class="btn small secondary" data-act="lostcsv">Download CSV (${fmtInt(lost.length + risk.length)} vehicles)</button>` : ''}</div>` + table(['VIN', 'Model', 'Last branch', 'Last advisor', 'Last visit', 'Visits', 'Spend'], lost.slice(0, 250).map(lrow), { align: ['', '', '', '', 'num', 'num', 'num'], maxH: 480 }));
  // vehicle age
  const byYear = new Map();
  for (const i of cur.idx) { if (S.act[i] === 2) continue; const vin = S.vin[i] >= 0 ? S.vins[S.vin[i]] : ''; const y = C.vinModelYear(vin, maxYear); const k = y == null ? 'Unknown' : y; let a = byYear.get(k); if (!a) { a = []; byYear.set(k, a); } a.push(i); }
  const band = y => { if (y === 'Unknown') return 'Unknown'; const age = maxYear - y; return age <= 1 ? '0–1 years' : age <= 3 ? '2–3 years' : age <= 5 ? '4–5 years' : age <= 8 ? '6–8 years' : '9+ years'; };
  const bands = new Map(); for (const [y, l] of byYear) { const b = band(y); const a = bands.get(b) || []; bands.set(b, a.concat(l)); }
  const order = ['0–1 years', '2–3 years', '4–5 years', '6–8 years', '9+ years', 'Unknown'];
  const bRows = order.filter(b => bands.has(b)).map(b => ({ name: b, sm: C.summarize(S, bands.get(b)) }));
  h += sec('Revenue by vehicle age', `Age from the model year coded in the VIN (10th character) against ${maxYear}. PDI excluded.`, hbars(bRows.map(x => ({ label: x.name, segs: [{ v: x.sm.payer[0], color: 'var(--c4)', name: 'Cash' }, { v: x.sm.payer[1], color: 'var(--c5)', name: 'Warranty' }], value: `<b>${egpC(x.sm.rev)}</b>`, sub: `${fmtInt(x.sm.ros)} ROs · ${fmtInt(x.sm.vins)} VTP · ${egpC(x.sm.revPerRo)}/RO` })), { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)']], aria: 'Revenue by vehicle age' }));
  const years = [...byYear.keys()].filter(y => y !== 'Unknown').sort((a, b) => b - a);
  h += sec('Model year detail', '', table(['Model year', 'Revenue', 'ROs', 'VTP', 'Rev / RO', 'Warranty share', 'Periodic ROs'], years.map(y => { const sm = C.summarize(S, byYear.get(y)); return [String(y), egp(sm.rev), fmtInt(sm.ros), fmtInt(sm.vins), egp(sm.revPerRo), pct(sm.rev ? sm.payer[1] / sm.rev : NaN), fmtInt(sm.perRos)]; }), { maxH: 420 }));
  // accounts
  const byPay = C.groupBy(S, cur.idx, i => S.payer[i]);
  const isIns = n => /insur|تأمين|takaful|assur/i.test(n), isInt = n => /egyptian international motors|eim/i.test(n);
  const acc = [...byPay].map(([pi, l]) => { const name = pi >= 0 ? S.payers[pi] : '(blank)'; const sm = C.summarize(S, l); return { name, sm, type: isIns(name) ? 'Insurance' : isInt(name) ? 'Internal (EIM)' : sm.ros >= 3 ? 'Account' : 'Individual' }; }).filter(x => x.type !== 'Individual' && x.name !== '(blank)').sort((a, b) => b.sm.rev - a.sm.rev);
  const insTot = acc.filter(x => x.type === 'Insurance').reduce((t, x) => t + x.sm.rev, 0), accTot = acc.filter(x => x.type === 'Account').reduce((t, x) => t + x.sm.rev, 0);
  h += cards([
    { label: 'Insurance companies', value: egpC(insTot), note: `${acc.filter(x => x.type === 'Insurance').length} insurers · ${pct(cur.sm.rev ? insTot / cur.sm.rev : NaN)} of revenue` },
    { label: 'Corporate and fleet accounts', value: egpC(accTot), note: `${acc.filter(x => x.type === 'Account').length} payers with 3+ ROs · ${pct(cur.sm.rev ? accTot / cur.sm.rev : NaN)} of revenue`, t: 't-blue' },
  ], 'Accounts figures');
  h += sec('Top insurance and corporate accounts', 'Payers with three or more repair orders in the period, plus every insurer. Insurers are recognised by name.', hbars(acc.slice(0, 15).map(x => ({ label: x.name, segs: [{ v: x.sm.rev, color: x.type === 'Insurance' ? 'var(--c2)' : x.type === 'Internal (EIM)' ? 'var(--grey)' : 'var(--c1)' }], value: `<b>${egpC(x.sm.rev)}</b>`, sub: `${fmtInt(x.sm.ros)} ROs · ${fmtInt(x.sm.vins)} VTP · disc. ${pct(x.sm.rate)}` })), { legend: [['Insurance', 'var(--c2)'], ['Account', 'var(--c1)'], ['Internal', 'var(--grey)']], aria: 'Top accounts' }));
  h += sec('Accounts table', '', table(['Payer', 'Type', 'Revenue', 'ROs', 'VTP', 'Rev / RO', 'Discount rate', 'Warranty share'], acc.slice(0, 60).map(x => [esc(x.name), x.type, egp(x.sm.rev), fmtInt(x.sm.ros), fmtInt(x.sm.vins), egp(x.sm.revPerRo), pct(x.sm.rate), pct(x.sm.rev ? x.sm.payer[1] / x.sm.rev : NaN)]), { maxH: 480 }));
  return h;
}

/* ======================= page: forecast & alerts ======================= */
function forecastData() {
  const S = A.S, ym = C.ymOf(S.maxDay), t = A.T.byMonth.get(ym);
  const f = F({ s: ym, e: ym });
  const idx = C.select(S, f);
  const days = new Set(); for (let i = 0; i < S.n; i++) if (S.ym[i] === ym && S.net[i] > 0) days.add(S.day[i]);
  let sunThu = 0; for (let d = 1; d <= C.daysInMonth(ym); d++) { const wdN = C.intToDate(ym * 100 + d).getUTCDay(); if (wdN <= 4) sunThu++; }
  const elapsed = days.size, wdEst = !(t && t.wd), wd = t && t.wd ? t.wd : sunThu, complete = S.maxDay % 100 === C.daysInMonth(ym) || (wd && elapsed >= wd);
  const st = stats(ym, ym);
  const ach = C.achievement(S, A.T, f);
  const unitRev = new Map(); for (const r of ach.rows) unitRev.set(r.unit, r);
  return { ym, t, wd, wdEst, elapsed, complete, ach, idx, rows: ach.rows, rev: st.sm.rev };
}
function pageAlerts() {
  const S = A.S, fc = forecastData();
  const rem = fc.wd ? Math.max(0, fc.wd - fc.elapsed) : null;
  const proj = (rev) => (fc.wd && fc.elapsed ? rev / fc.elapsed * fc.wd : NaN);
  let h = '';
  const netRev = fc.rev, tgtRev = fc.ach.revenue, tgt = fc.ach.target, hasT = Number.isFinite(tgt) && tgt > 0;
  h += cards([
    { label: `${ymLbl(fc.ym)} revenue to date`, value: egpC(netRev), note: `${fc.elapsed} billing days so far of ${fc.wd} working days${fc.wdEst ? ' (estimated Sun–Thu; no target report yet)' : ''}` },
    { label: 'Projected month-end', value: egpC(fc.complete ? netRev : proj(netRev)), note: fc.complete ? 'Month complete' : 'Run-rate: revenue ÷ days elapsed × working days', t: 't-blue' },
    { label: 'Projected achievement', value: hasT ? achText(fc.complete ? fc.ach.ach : proj(tgtRev) / tgt) : 'N/A', note: hasT ? `Target ${egpC(tgt)}` : 'No target report for this month yet', t: 't-mag' },
    { label: 'Needed per remaining day', value: rem && hasT ? egpC((tgt - tgtRev) / rem) : '—', note: rem ? `${rem} working days left · current ${egpC(fc.elapsed ? netRev / fc.elapsed : NaN)}/day` : fc.complete ? 'Month complete' : '—', t: 't-dark' },
  ], `Month-end forecast — ${ymLbl(fc.ym)}`);
  const rows = fc.rows.filter(r => r.target > 0).map(r => { const p = fc.complete ? r.rev : proj(r.rev); const need = rem ? (r.target - r.rev) / rem : NaN, now = fc.elapsed ? r.rev / fc.elapsed : NaN; return { r, p, need, now }; }).sort((a, b) => (a.p / a.r.target) - (b.p / b.r.target));
  h += sec(`Forecast by unit — ${ymLbl(fc.ym)}`, 'Projected month-end revenue against target. The daily rate needed for the rest of the month is compared with the rate so far: ▲ means the unit is already running fast enough.', hbars(rows.map(x => ({ label: x.r.unit, segs: [{ v: Math.max(0, x.p), color: statusColor(x.p / x.r.target) }], marker: x.r.target, value: `<b>${egpC(x.p)}</b>`, sub: `${achLine(x.p, x.r.target)}${rem ? `<br><span class="mini">needs ${egpC(x.need)}/day · now ${egpC(x.now)}/day</span> ${x.now >= x.need ? '<span class="arrow up">▲ on pace</span>' : '<span class="arrow down">▼ behind</span>'}` : ''}` })), { aria: 'Forecast by unit', emptyText: 'No target report for the latest month.' }) + table(['Unit', 'Revenue to date', 'Target', 'Projected', 'Projected ach.', 'Needed / day', 'Current / day'], rows.map(x => [esc(x.r.unit), egp(x.r.rev), egp(x.r.target), egp(x.p), achText(x.p / x.r.target), rem ? egp(x.need) : '—', egp(x.now)])));
  // alerts
  const al = buildAlerts();
  h += sec(`Alerts (${al.length})`, 'Checked against the thresholds below for the selected period and branches.', al.length ? `<ul class="insights">${al.map(a => `<li class="${a.level === 'warn' ? 'warn' : ''}">${a.text}</li>`).join('')}</ul>` : '<div class="notice ok">No alerts for this selection.</div>');
  const th = A.cfg.alerts || {}; const admin = isAdmin();
  const inp = (k, lbl, v) => `<div class="field"><label for="al-${k}">${lbl}</label><input id="al-${k}" class="inp" type="number" step="0.1" value="${(v * 100).toFixed(1)}" ${admin ? '' : 'disabled'}></div>`;
  h += `<details class="box"><summary>Alert thresholds</summary><div class="toolbar" style="margin:0 0 12px;align-items:flex-end">${inp('achBelow', 'Branch achievement below (%)', th.achBelow ?? 0.9)}${inp('partsAchBelow', 'Parts achievement below (%)', th.partsAchBelow ?? 0.9)}${inp('discRate', 'Branch discount rate above (%)', th.discRate ?? 0.03)}${inp('advDiscRate', 'Advisor discount rate above (%)', th.advDiscRate ?? 0.05)}${inp('revRoDrop', 'Revenue per RO drop above (%)', th.revRoDrop ?? 0.15)}${admin ? '<button class="btn" data-act="alsave">Save thresholds</button>' : ''}</div></details>`;
  h += checklistSection();
  return h;
}
function buildAlerts() {
  const S = A.S, th = Object.assign({ achBelow: 0.9, discRate: 0.03, advDiscRate: 0.05, revRoDrop: 0.15, partsAchBelow: 0.9 }, A.cfg.alerts || {});
  const out = [], cur = stats(A.f.s, A.f.e);
  const ta = compByBranch(F(), 'total'), pa = compByBranch(F(), 'P');
  for (const [bi, t] of ta.by) if (t.target > 0 && t.rev / t.target < th.achBelow) out.push({ level: 'warn', text: `<b>${esc(S.branches[bi])}</b> is at ${achText(t.rev / t.target)} of target (${egpC(t.rev)} of ${egpC(t.target)}).` });
  for (const [bi, t] of pa.by) if (t.target > 0 && t.rev / t.target < th.partsAchBelow) out.push({ level: 'warn', text: `<b>${esc(S.branches[bi])}</b> parts are at ${achText(t.rev / t.target)} of the parts budget.` });
  const byB = C.groupBy(S, cur.idx, i => S.br[i]);
  const len = (Math.floor(A.f.e / 100) * 12 + A.f.e % 100) - (Math.floor(A.f.s / 100) * 12 + A.f.s % 100) + 1;
  const prev = stats(C.ymAdd(A.f.s, -len), C.ymAdd(A.f.e, -len)); const pb = C.groupBy(S, prev.idx, i => S.br[i]);
  for (const [bi, l] of byB) {
    const sm = C.summarize(S, l);
    if (sm.rate > th.discRate) out.push({ level: 'warn', text: `<b>${esc(S.branches[bi])}</b> discount rate is ${pct(sm.rate)} (threshold ${pct(th.discRate)}), ${egpC(sm.disc)} on ${fmtInt(sm.discRos)} ROs.` });
    const p = pb.get(bi); if (p) { const ps = C.summarize(S, p); const d = chg(sm.revPerRo, ps.revPerRo); if (d < -th.revRoDrop) out.push({ level: 'warn', text: `<b>${esc(S.branches[bi])}</b> revenue per RO fell ${pct(-d)} to ${egpC(sm.revPerRo)} against the previous ${len} month(s).` }); }
  }
  const byA = C.groupBy(S, Array.from(cur.idx).filter(i => S.act[i] !== 2), i => S.adv[i]);
  for (const [ai, l] of byA) { const sm = C.summarize(S, l); if (sm.ros >= 20 && sm.rate > th.advDiscRate) out.push({ level: 'warn', text: `Advisor <b>${esc(S.advs[ai])}</b> gives a ${pct(sm.rate)} discount rate on ${fmtInt(sm.ros)} ROs.` }); }
  const now = new Date(), lastFull = C.ymAdd(now.getFullYear() * 100 + now.getMonth() + 1, -1);
  if (!A.coverage.has(lastFull)) out.push({ level: 'warn', text: `No transaction file is saved for ${ymLbl(lastFull)}.` });
  if (!A.T.byMonth.has(lastFull)) out.push({ level: 'warn', text: `No target report is saved for ${ymLbl(lastFull)}.` });
  const unm = [...S.plants.values()].filter(p => !p.branch); if (unm.length) out.push({ level: 'warn', text: `Unmapped plants: ${unm.map(p => esc(p.raw)).join(', ')}.` });
  const unk = S.advs.filter((a, i) => S.advInfo[i].status === 'unknown'); if (unk.length) out.push({ level: 'info', text: `Advisor codes without names: ${unk.slice(0, 8).map(esc).join(', ')}.` });
  if (cur.days.missing.length) out.push({ level: 'info', text: `Working days missing for ${cur.days.missing.map(ymLbl).join(', ')}.` });
  return out;
}
function checklistSection() {
  const now = new Date(), lastFull = C.ymAdd(now.getFullYear() * 100 + now.getMonth() + 1, -1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const exported = A.audit.some(a => a.action === 'Output exported' && a.at >= monthStart);
  const driveDone = A.imports.some(d => d.source === 'drive' && d.uploadedAt >= monthStart);
  const items = [[A.coverage.has(lastFull), `Transactions for ${ymLbl(lastFull)} imported`], [A.T.byMonth.has(lastFull), `Target report for ${ymLbl(lastFull)} imported`], [driveDone, 'Google Drive checked this month'], [exported, 'Monthly pack exported this month (Output tab)'], [!buildAlertsQuick(), 'Mappings complete (plants and advisor codes)']];
  return sec('Monthly checklist', 'Due on the 2nd working day of each month. A reminder runs as a scheduled task outside the studio.', table(['Status', 'Task'], items.map(([ok, t]) => [ok ? '<span class="tag on">Done</span>' : '<span class="tag below">Open</span>', t]), { align: ['', ''] }));
}
function buildAlertsQuick() { const S = A.S; return [...S.plants.values()].some(p => !p.branch) || S.advs.some((a, i) => S.advInfo[i].status === 'unknown'); }

/* ======================= advisor scorecard ======================= */
function adviserScorecard() {
  const S = A.S, cur = stats(A.f.s, A.f.e);
  const idxNP = Array.from(cur.idx).filter(i => S.act[i] !== 2);
  const byA = C.groupBy(S, idxNP, i => S.adv[i]);
  const list = [...byA].map(([ai, l]) => ({ ai, sm: C.summarize(S, l), l })).sort((a, b) => b.sm.rev - a.sm.rev);
  if (!list.length) return '';
  if (A.advCard == null || !byA.has(A.advCard)) A.advCard = list[0].ai;
  const me = list.find(x => x.ai === A.advCard), rank = list.indexOf(me) + 1;
  const sel = `<div class="field" style="max-width:320px"><label for="adv-card">Advisor</label><select id="adv-card" data-act="advcard">${list.map(x => `<option value="${x.ai}" ${x.ai === A.advCard ? 'selected' : ''}>${esc(S.advs[x.ai])}</option>`).join('')}</select></div>`;
  const sm = me.sm, n = list.length;
  const rankOf = key => 1 + list.filter(x => (x.sm[key] || 0) > (sm[key] || 0)).length;
  const brs = [...new Set(me.l.map(i => S.branches[S.br[i]]))];
  let h = `<div class="section"><div class="sec-head"><div><h2>Advisor scorecard</h2><p>One advisor at a time for the selected period; ranks are among the ${n} advisors with revenue. Export a scorecard from the Output tab by its number.</p></div>${sel}</div></div>`;
  h += cards([
    { label: 'Revenue', value: egpC(sm.rev), note: `Rank ${rank} of ${n} · ${esc(brs.join(', '))}` },
    { label: 'Repair orders', value: fmtInt(sm.ros), count: true, note: `${fmtInt(sm.vins)} VTP · rank ${rankOf('ros')}`, t: 't-blue' },
    { label: 'Revenue per RO', value: egpC(sm.revPerRo), note: `Rank ${rankOf('revPerRo')} of ${n}`, t: 't-mag' },
    { label: 'Discount rate', value: pct(sm.rate), note: `${egpC(sm.disc)} on ${fmtInt(sm.discRos)} ROs`, t: 't-dark' },
    { label: 'Labour / hours', value: egpC(sm.labour), note: `${fmtInt(sm.hours)} h · ${egpC(sm.labourRate)}/h` },
    { label: 'Parts per RO', value: egpC(sm.partsPerRo), note: `${egpC(sm.parts)} parts · rank ${rankOf('partsPerRo')}`, t: 't-blue' },
    { label: 'Appointment rate', value: pct(sm.apptRate), note: `${fmtInt(sm.apptRos)} appointment ROs`, t: 't-mag' },
    { label: 'Periodic-maintenance ROs', value: fmtInt(sm.perRos), count: true, note: `${pct(sm.ros ? sm.perRos / sm.ros : NaN)} of ROs`, t: 't-amber' },
  ], `Scorecard — ${S.advs[A.advCard]}`);
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  const byM = C.groupBy(S, me.l, i => S.ym[i]);
  h += sec(`Monthly revenue — ${esc(S.advs[A.advCard])}`, '', lineChart({ labels: months.map(ymLbl), series: [{ name: S.advs[A.advCard], color: 'var(--blue)', values: months.map(m => (byM.has(m) ? C.summarize(S, byM.get(m)).rev : null)) }], fmt: 'money', aria: 'Advisor monthly revenue' }));
  return h;
}

/* ======================= saved views (Output tab) ======================= */
function viewsSection() {
  const admin = isAdmin();
  const rows = (A.views || []).map(v => [`<b>${esc(v.name)}</b><div class="mini">${esc(v.text || '')}</div>`, `<span class="mini">${esc(v.period || '')}</span>`, `<div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn small secondary" data-act="viewload" data-id="${esc(v.id)}">Load</button><button class="btn small" data-act="viewpptx" data-id="${esc(v.id)}">PPT</button><button class="btn small secondary" data-act="viewpdf" data-id="${esc(v.id)}">PDF</button>${admin ? `<button class="btn small secondary" data-act="viewdel" data-id="${esc(v.id)}">Delete</button>` : ''}</div>`]);
  return `<div class="section"><h2>Saved views for the PowerPoint and PDF</h2><p>A view stores the filters and the selected chart numbers for the PowerPoint and PDF, so a monthly pack is one click. Loading a view switches the filters to the saved ones; choose “Latest month” to always use the newest data.</p>${admin ? `<div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field wide"><label for="view-name">View name</label><input id="view-name" class="inp" placeholder="Monthly GM pack"></div><div class="field"><label for="view-mode">Period when loaded</label><select id="view-mode"><option value="latest">Latest month</option><option value="ytd">Year to date (latest)</option><option value="fixed">Exactly as now</option></select></div><button class="btn" data-act="viewsave" ${parseIds(A.out.text).length ? '' : 'disabled'}>Save view</button></div>` : ''}${rows.length ? `<div class="scroll"><table class="table"><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 2 ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="mini">No saved views yet.</div>'}</div>`;
}
function applyView(v) {
  const S = A.S, cut = C.ymOf(S.maxDay);
  Object.assign(A.f, v.f || {});
  if (v.mode === 'latest') { A.f.s = cut; A.f.e = cut; }
  else if (v.mode === 'ytd') { A.f.e = cut; A.f.s = Math.floor(cut / 100) * 100 + 1; }
  A.out.text = v.text || ''; if (v.title) A.out.title = v.title;
  if (v.advScope) A.advScope = v.advScope; if (v.partsNoSvc != null) A.partsNoSvc = v.partsNoSvc;
}

/* ======================= page: Customer shows – VTP analysis ======================= */
function vtpContext() {
  const S = A.S, f = Object.assign(F(), { branches: permittedSet() });
  const an = C.vtpAnalysis(S, f, { dim: A.vtpDim, focus: A.f.branch !== 'all' ? curSet(false) : null });
  const txn = A.imports.filter(d => d.kind === 'txn' && C.ymFromStr(d.period) >= A.f.s && C.ymFromStr(d.period) <= A.f.e);
  const excl = []; let exclLines = 0;
  for (const d of txn) for (const [m, v] of Object.entries(d.months || {})) { const ym = C.ymFromStr(m); if (ym < A.f.s || ym > A.f.e) { exclLines += v.lines; excl.push(`${v.lines} line${v.lines > 1 ? 's' : ''} billed in ${ymLbl(ym)} (${d.fileName})`); } }
  const fixes = txn.reduce((t, d) => t + ((d.stats || {}).dateFixes || 0), 0), fixList = txn.flatMap(d => (d.stats || {}).dateFixList || []).slice(0, 20);
  const unchecked = txn.filter(d => !d.stats || d.stats.dateFixes == null).length;
  const period = A.f.s === A.f.e ? (() => { const m = MON[A.f.s % 100 - 1]; return ({ Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' })[m] + ' ' + Math.floor(A.f.s / 100); })() : `${ymLbl(A.f.s)} – ${ymLbl(A.f.e)}`;
  return { an, excl, exclLines, fixes, fixList, unchecked, period };
}
function vtpText(ctx) {
  const an = ctx.an, out = [];
  const p = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : 'N/A');
  out.push(`<b>${fmtInt(an.unique)}</b> unique vehicles (VTP) were served in ${esc(ctx.period)} across ${an.branches.length} ${A.vtpDim === 'branch' ? 'branches' : 'plants'}, from ${fmtInt(an.lines)} invoice lines. <b>${fmtInt(an.one)}</b> (${p(an.one, an.unique)}) visited only one branch; <b>${fmtInt(an.multi)}</b> (${p(an.multi, an.unique)}) visited two or more (${fmtInt(an.nbCount[2])} at 2, ${fmtInt(an.nbCount[3])} at 3, ${fmtInt(an.nbCount[4])} at 4+).`);
  if (an.links.length) out.push(`Strongest branch links: ${an.links.slice(0, 3).map(l => `<b>${esc(l.a)}–${esc(l.b)}</b> ${fmtInt(l.n)}`).join(' · ')}.`);
  const hs = an.branches.filter(b => b.unique >= 20).slice().sort((a, b) => b.pctShared - a.pctShared).slice(0, 3);
  if (hs.length) out.push(`Highest share of vehicles also seen at another branch: ${hs.map(b => `<b>${esc(b.name)}</b> ${(b.pctShared * 100).toFixed(1)}%`).join(' · ')}.`);
  const sumU = an.units.reduce((t, u) => t + u.distinct, 0), ret = an.units.reduce((t, u) => t + u.returning, 0);
  out.push(`Per ${an.single ? 'week' : 'month'}, VTP add up to ${fmtInt(sumU)} — ${fmtInt(sumU - an.unique)} more than unique — because ${fmtInt(ret)} vehicle-${an.single ? 'weeks' : 'months'} were returning visits within the period.${an.single ? ` W4 has ${an.w4days} days.` : ''}`);
  out.push(`Branch-level VTP (each branch's own unique vehicles added up) is ${fmtInt(an.branchLevel)}, ${fmtInt(an.branchLevel - an.unique)} more than the network figure: that is the double counting removed.`);
  if (A.f.branch !== 'all') {
    const b = an.branches.find(x => x.name === A.f.branch || (A.vtpDim === 'plant' && C.resolvePlant(x.name, A.cfg).branch === A.f.branch));
    if (b) { const top = an.links.filter(l => l.a === b.name || l.b === b.name).slice(0, 3).map(l => `${esc(l.a === b.name ? l.b : l.a)} (${l.n})`); out.push(`<b>${esc(b.name)}</b>: ${fmtInt(b.unique)} unique VTP, ${fmtInt(b.shared)} (${(b.pctShared * 100).toFixed(1)}%) also seen at another branch${top.length ? `, mostly ${top.join(', ')}` : ''}.`); }
  }
  const notes = [];
  if (an.phLines.length) notes.push(`placeholder VINs left out: ${an.phLines.map(x => `${esc(x.vin)} (${x.lines} line${x.lines > 1 ? 's' : ''})`).join(', ')}`);
  notes.push(`blank VINs: ${fmtInt(an.blankLines)} line${an.blankLines === 1 ? '' : 's'}`);
  if (ctx.exclLines) notes.push(`excluded (outside the period): ${ctx.excl.map(esc).join('; ')}`);
  notes.push(ctx.fixes ? `future-year billing dates corrected to the Created On year: ${ctx.fixes}` : ctx.unchecked ? `future-year date check: re-import ${ctx.unchecked} file(s) saved before this check existed` : 'no future-year billing dates found');
  out.push(`Notes — ${notes.join('; ')}.`);
  return out;
}
function pageVtp() {
  const ctx = vtpContext(), an = ctx.an;
  if (!an.unique) return '<div class="section empty"><strong>No vehicles in this period</strong>Choose another period or upload transaction files.</div>';
  const dimSw = `<div class="choices">${[['plant', 'Plants as in the export (column A)'], ['branch', 'Mapped branches']].map(x => `<button class="choice ${A.vtpDim === x[0] ? 'on' : ''}" data-act="vtpdim" data-v="${x[0]}">${x[1]}</button>`).join('')}${A.caps.downloads ? `<button class="btn yellow small" data-act="vtpxlsx">Download VTP_Analysis_${esc(ctx.period.replace(/[^\w]+/g, '_'))}.xlsx</button>` : ''}</div>`;
  let h = `<div class="section"><div class="sec-head"><div><h2>Customer shows — VTP analysis</h2><p>VTP = distinct VIN (trimmed, upper case). Placeholder VINs such as 000000000000OTHER and blank VINs are left out of every count. Lines are assigned by billing date; “New” means the first visit within the selected period. All permitted branches are included${A.f.branch !== 'all' ? '; the selected branch gets its own line in the analysis' : ''}. Activity filter: ${A.f.act === 'all' ? 'EM + BS + PDI' : esc(A.f.act)}.</p></div></div>${dimSw}</div>`;
  h += cards([
    { label: 'Unique VTP', value: fmtInt(an.unique), count: true, note: `From ${fmtInt(an.lines)} invoice lines` },
    { label: 'Seen at 2+ branches', value: fmtInt(an.multi), count: true, note: `${pct(an.unique ? an.multi / an.unique : NaN)} · ${fmtInt(an.nbCount[2])} at 2 · ${fmtInt(an.nbCount[3])} at 3 · ${fmtInt(an.nbCount[4])} at 4+`, t: 't-mag' },
    { label: 'One branch only', value: fmtInt(an.one), count: true, note: pct(an.unique ? an.one / an.unique : NaN), t: 't-blue' },
    { label: 'Branch-level VTP', value: fmtInt(an.branchLevel), count: true, note: `Sum of each branch's unique VTP (+${fmtInt(an.branchLevel - an.unique)} double counting)`, t: 't-dark' },
  ], 'VTP key figures');
  h += sec('VTP analysis', 'Written from the figures on this page.', `<ul class="insights">${vtpText(ctx).map(t => `<li>${t}</li>`).join('')}</ul>`);
  const uw = an.single ? 'week' : 'month';
  const urows = an.units.map(u => [esc(u.label), fmtInt(u.distinct), fmtInt(u.new), fmtInt(u.returning), fmtInt(u.acc), fmtInt(u.multi)]);
  const sumD = an.units.reduce((t, u) => t + u.distinct, 0), sumN = an.units.reduce((t, u) => t + u.new, 0), lastAcc = an.units.length ? an.units[an.units.length - 1].acc : 0;
  urows.push({ _cls: 'total', cells: ['Total / check', fmtInt(sumD), fmtInt(sumN), fmtInt(sumD - sumN), `${fmtInt(lastAcc)} ${lastAcc === an.unique ? '<span class="tag on">= unique</span>' : '<span class="tag below">≠ unique</span>'}`, ''] });
  h += sec(`VTP by ${uw}`, `Distinct VTP in each ${uw}; new = first visit in the period; accumulated must end at unique VTP.${an.single ? ` W1 = 1–7, W2 = 8–14, W3 = 15–21, W4 = 22 to month end (${an.w4days} days).` : ''}`, lineChart({ labels: an.units.map(u => u.label), series: [{ name: 'Distinct VTP', color: 'var(--blue)', values: an.units.map(u => u.distinct) }, { name: 'New VTP', color: 'var(--c4)', values: an.units.map(u => u.new) }, { name: 'Returning VTP', color: 'var(--c2)', values: an.units.map(u => u.returning) }], fmt: 'int', aria: 'VTP by period' }) + table(['Period', 'Distinct VTP', 'New VTP', 'Returning VTP', 'Accumulated VTP', `VTP at 2+ branches in the same ${uw}`], urows));
  // overlap grid
  const B = an.branches.length;
  const gr = an.branches.map((b, a) => [`<b>${esc(b.name)}</b>`].concat(an.branches.map((c, j) => (a === j ? `<span class="diag">${fmtInt(an.grid[a][a])}</span>` : an.grid[a][j] ? fmtInt(an.grid[a][j]) : '<span class="mini">0</span>'))));
  gr.push({ _cls: 'total', cells: ['Branch unique VTP'].concat(an.branches.map(b => fmtInt(b.unique))) });
  gr.push({ _cls: 'total', cells: ['…shared with another branch'].concat(an.branches.map(b => fmtInt(b.shared))) });
  gr.push({ _cls: 'total', cells: ['% shared'].concat(an.branches.map(b => pct(b.pctShared))) });
  h += sec('Shared vehicles between branches', 'Each cell = unique VTP that visited both the row and the column branch; the highlighted diagonal is the branch’s own unique VTP. Branches are ordered by revenue.', table(['Branch'].concat(an.branches.map(b => esc(b.name))), gr));
  h += sec('Share of vehicles seen at another branch', '', hbars(an.branches.slice().sort((a, b) => b.pctShared - a.pctShared).map(b => ({ label: b.name, segs: [{ v: b.pctShared, color: 'var(--c2)' }], value: `<b>${pct(b.pctShared)}</b>`, sub: `${fmtInt(b.shared)} of ${fmtInt(b.unique)} VTP` })), { max: Math.max(...an.branches.map(b => b.pctShared), 0.0001), aria: '% shared by branch' }));
  h += sec('Top 12 branch combinations', `Which branches the ${fmtInt(an.multi)} multi-branch vehicles visited.`, table(['Branches visited', 'No. of branches', 'Unique VTP', '% of multi-branch VTP'], an.combos.slice(0, 12).map(c => [esc(c.combo), String(c.nb), fmtInt(c.n), pct(an.multi ? c.n / an.multi : NaN)]).concat([{ _cls: 'total', cells: ['Total multi-branch VTP', '', fmtInt(an.multi), an.multi ? '100.0%' : '—'] }])));
  const fd = d => (d ? dayLbl(d) : '—');
  h += sec(`Multi-branch vehicles (${fmtInt(an.multiRows.length)})`, 'Sorted by number of branches, then repair orders. The full list is in the Excel download.', table(['VIN', 'No. of branches', 'Branches visited', 'No. of ROs', 'First visit', 'Last visit'], an.multiRows.slice(0, 150).map(r => [`<span style="font-family:ui-monospace,monospace;font-size:11.5px">${esc(r.vin)}</span>`, String(r.nb), esc(r.combo), fmtInt(r.ros), fd(r.firstDay), fd(r.lastDay)]), { align: ['', 'num', '', 'num', 'num', 'num'], maxH: 480 }));
  A._vtp = ctx;
  return h;
}
async function exportVtpXlsx() {
  const ctx = A._vtp || vtpContext();
  setBusy('Building VTP workbook');
  try {
    await loadScript(LIB.jszip);
    const files = C.vtpWorkbook(ctx.an, { period: ctx.period, excludedNote: ctx.exclLines ? `${ctx.exclLines} line(s) outside the period excluded: ${ctx.excl.join('; ')}` : 'no lines outside the period' });
    const z = new window.JSZip(); for (const [k, v] of Object.entries(files)) z.file(k, v);
    const blob = await z.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    setBusy(null);
    await saveFile(`VTP_Analysis_${ctx.period.replace(/[^\w]+/g, '_')}.xlsx`, blob);
    audit('VTP workbook exported', ctx.period);
  } catch (e) { setBusy(null); toast('VTP workbook failed: ' + (e.message || e), true); }
}

/* ======================= After-sales fast report (12 slides, PPTX + PDF from one layout) ======================= */
const FR = {
  W: 13.333, H: 7.5,
  K: { black: '000000', white: 'FFFFFF', grey: '888B8D', yellow: 'EFDF00', lgrey: 'BBBCBC', pgrey: 'D9D9D6', mag: 'BB28BB', blue: '1E22AA', amber: 'FFCC33', green: '1E8E3E', red: 'D0021B', ink: '000000', muted: '6B6E70', box: 'F2F2EF' },
};
const FMON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const frMonth = ym => `${FMON[ym % 100 - 1]} ${Math.floor(ym / 100)}`;
const frShort = ym => `${MON[ym % 100 - 1]} ${String(Math.floor(ym / 100)).slice(2)}`;
const frM = v => (!Number.isFinite(v) ? 'n/a' : Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : groupInt(Math.round(v) || 0));
const frE = v => (Number.isFinite(v) ? 'EGP ' + frM(v) : 'n/a');
const frEi = v => (Number.isFinite(v) ? 'EGP ' + groupInt(Math.round(v) || 0) : 'n/a');
const frN = v => (Number.isFinite(v) ? groupInt(Math.round(v) || 0) : 'n/a');
const frP = v => (Number.isFinite(v) ? (Math.round(v * 1000) / 10).toFixed(1) + '%' : 'n/a');
const frChg = (a, b) => { if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return { t: 'n/a', c: FR.K.grey }; const d = (a - b) / Math.abs(b); const r = Math.round(d * 1000) / 10; return { t: `${r > 0 ? '+' : ''}${r.toFixed(1)}%`, c: r > 0 ? FR.K.green : r < 0 ? FR.K.red : FR.K.grey, d }; };
const frPts = (a, b, invert) => { if (!Number.isFinite(a) || !Number.isFinite(b)) return { t: 'n/a', c: FR.K.grey }; const r = Math.round((a - b) * 1000) / 10; const good = invert ? r < 0 : r > 0, bad = invert ? r > 0 : r < 0; return { t: `${r > 0 ? '+' : ''}${r.toFixed(1)} pts`, c: good ? FR.K.green : bad ? FR.K.red : FR.K.grey }; };
const frAchCol = a => (Number.isFinite(a) && C.roundPct(a) >= 100 ? FR.K.green : FR.K.red);
const estW = (t, size, bold) => String(t).length * size / 72 * (bold ? 0.56 : 0.52);
const fitSize = (t, w, size, bold, min) => { let s = size; while (s > (min || 6) && estW(t, s, bold) > w) s -= 0.5; return s; };

/* ---------- dotted bar image (shared by both outputs) ---------- */
const dotCache = new Map();
function dotted(w, h) {
  const k = `${Math.max(0.02, Math.round(w * 50) / 50)}x${Math.max(0.02, Math.round(h * 50) / 50)}`;
  if (dotCache.has(k)) return { data: dotCache.get(k), key: 'dot' + k.replace(/[.x]/g, '_') };
  const [ww, hh] = k.split('x').map(Number), ppi = 110, cw = Math.max(2, Math.round(ww * ppi)), ch = Math.max(2, Math.round(hh * ppi));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const x = cv.getContext('2d');
  x.fillStyle = '#F4F4F2'; x.fillRect(0, 0, cw, ch);
  x.fillStyle = '#888B8D'; const step = 5;
  for (let yy = 2; yy < ch; yy += step) for (let xx = (Math.floor(yy / step) % 2 ? 4 : 1.5); xx < cw; xx += step) { x.beginPath(); x.arc(xx, yy, 1.05, 0, 6.2832); x.fill(); }
  x.strokeStyle = '#888B8D'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, cw - 1, ch - 1);
  const d = cv.toDataURL('image/png'); dotCache.set(k, d);
  return { data: d, key: 'dot' + k.replace(/[.x]/g, '_') };
}
let frBgCache = null;
function frBackground() {
  if (frBgCache) return frBgCache;
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 900; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 1600, 900); g.addColorStop(0, '#000000'); g.addColorStop(1, '#1b1b1b'); x.fillStyle = g; x.fillRect(0, 0, 1600, 900);
  const dia = (cx, cy, s, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s * 0.6, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s * 0.6, cy); x.closePath(); x.stroke(); };
  dia(1250, 450, 560, 'rgba(255,255,255,0.05)', 70); dia(1250, 450, 400, 'rgba(255,255,255,0.04)', 50); dia(1250, 450, 250, 'rgba(239,223,0,0.10)', 28);
  x.fillStyle = '#EFDF00'; x.fillRect(0, 0, 14, 900);
  frBgCache = cv.toDataURL('image/jpeg', 0.9);
  return frBgCache;
}

/* ---------- renderers ---------- */
function frPptx(P, face) {
  let s = null;
  face = face || 'NouvelR';
  return {
    kind: 'pptx',
    slide(bg) { s = P.addSlide(); s.background = bg ? { data: bg.replace(/^data:/, '') } : { color: 'FFFFFF' }; },
    rect(x, y, w, h, o) { if (w <= 0 || h <= 0) return; s.addShape(o.r ? P.ShapeType.roundRect : P.ShapeType.rect, Object.assign({ x, y, w, h, fill: o.fill ? { color: o.fill } : { type: 'none' }, line: o.line ? { color: o.line, width: o.lineW || 0.75, dashType: o.dash ? 'dash' : 'solid' } : { type: 'none' } }, o.r ? { rectRadius: o.r } : {})); },
    line(x1, y1, x2, y2, o) { s.addShape(P.ShapeType.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(0.001, Math.abs(x2 - x1)), h: Math.max(0.001, Math.abs(y2 - y1)), flipV: (y2 < y1) !== (x2 < x1), line: { color: o.color || FR.K.grey, width: o.w || 0.75, dashType: o.dash ? 'dash' : 'solid' } }); },
    image(img, x, y, w, h) { if (w <= 0 || h <= 0) return; s.addImage({ data: String(img.data || img).replace(/^data:/, ''), x, y, w, h }); },
    text(t, x, y, w, h, o) {
      o = o || {}; const runs = Array.isArray(t) ? t : [{ t: String(t) }];
      s.addText(runs.map(r => ({ text: r.t, options: { bold: r.bold != null ? r.bold : !!o.bold, italic: r.italic != null ? r.italic : !!o.italic, color: r.color || o.color || FR.K.ink, fontSize: r.size || o.size || 11, fontFace: face, breakLine: !!r.br } })), { x, y, w, h, margin: 0, align: o.align || 'left', valign: o.valign || 'middle', fontFace: face, fontSize: o.size || 11, wrap: o.wrap !== false, lineSpacingMultiple: o.ls || 1.0 });
    },
  };
}
function frPdf(doc) {
  const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)];
  let first = true; const fam = doc.__inter ? 'Inter' : 'helvetica';
  const setFont = (b, i) => doc.setFont(fam, b && i ? (doc.__inter ? 'bold' : 'bolditalic') : b ? 'bold' : i ? 'italic' : 'normal');
  const imgs = new Set();
  return {
    kind: 'pdf',
    slide(bg, key) { if (!first) doc.addPage([FR.W, FR.H], 'landscape'); first = false; if (bg) doc.addImage(bg, 'JPEG', 0, 0, FR.W, FR.H, 'frbg' + (key || ''), 'FAST'); },
    rect(x, y, w, h, o) {
      if (w <= 0 || h <= 0) return;
      if (o.fill) doc.setFillColor(...hex(o.fill)); if (o.line) { doc.setDrawColor(...hex(o.line)); doc.setLineWidth((o.lineW || 0.75) / 72); doc.setLineDashPattern(o.dash ? [0.05, 0.035] : [], 0); }
      const st = o.fill && o.line ? 'FD' : o.fill ? 'F' : 'S';
      if (o.r) doc.roundedRect(x, y, w, h, Math.min(o.r, h / 2), Math.min(o.r, h / 2), st); else doc.rect(x, y, w, h, st);
      doc.setLineDashPattern([], 0);
    },
    line(x1, y1, x2, y2, o) { doc.setDrawColor(...hex(o.color || FR.K.grey)); doc.setLineWidth((o.w || 0.75) / 72); doc.setLineDashPattern(o.dash ? [0.06, 0.045] : [], 0); doc.line(x1, y1, x2, y2); doc.setLineDashPattern([], 0); },
    image(img, x, y, w, h) { if (w <= 0 || h <= 0) return; const key = img.key || 'img'; doc.addImage(img.data || img, 'PNG', x, y, w, h, key, 'FAST'); imgs.add(key); },
    text(t, x, y, w, h, o) {
      o = o || {}; const runs = (Array.isArray(t) ? t : [{ t }]).map(r => Object.assign({}, r, { t: r.t == null || (typeof r.t === 'number' && !Number.isFinite(r.t)) ? '' : String(r.t) }));
      if (![x, y, w, h].every(Number.isFinite)) return;
      // split on breaks into lines
      const lines = [[]]; for (const r of runs) { lines[lines.length - 1].push(r); if (r.br) lines.push([]); }
      const L = lines.filter(l => l.length);
      const size = o.size || 11, lh = size / 72 * 1.22 * (o.ls || 1);
      // wrap single-run long lines
      const out = [];
      for (const l of L) {
        if (o.wrap !== false && l.length === 1) { setFont(l[0].bold != null ? l[0].bold : o.bold, l[0].italic != null ? l[0].italic : o.italic); doc.setFontSize(l[0].size || size); const parts = doc.splitTextToSize(l[0].t, w); parts.forEach(p => out.push([Object.assign({}, l[0], { t: p, br: false })])); }
        else out.push(l);
      }
      const total = out.length * lh;
      let by = o.valign === 'top' ? y + size / 72 * 0.92 : o.valign === 'bottom' ? y + h - total + size / 72 * 0.92 : y + (h - total) / 2 + size / 72 * 0.92;
      for (const l of out) {
        const widths = l.map(r => { setFont(r.bold != null ? r.bold : o.bold, r.italic != null ? r.italic : o.italic); doc.setFontSize(r.size || size); return doc.getTextWidth(r.t); });
        const tw = widths.reduce((a, b) => a + b, 0);
        let cx = o.align === 'center' ? x + (w - tw) / 2 : o.align === 'right' ? x + w - tw : x;
        l.forEach((r, k) => { setFont(r.bold != null ? r.bold : o.bold, r.italic != null ? r.italic : o.italic); doc.setFontSize(r.size || size); doc.setTextColor(...hex(r.color || o.color || FR.K.ink)); doc.text(r.t, cx, by); cx += widths[k]; });
        by += lh;
      }
    },
  };
}

/* ---------- data ---------- */
function frStats(ym, ye) {
  ye = ye || ym;
  const S = A.S, f = { s: ym, e: ye, branches: permittedSet(), act: 'all', noOW: !!(A.f.noOW && owDefined()) };
  const idx = C.select(S, f), sm = C.summarize(S, idx), ach = C.achievement(S, A.T, f), days = workingDays(ym, ye);
  const t = A.T.byMonth.get(ym);
  const roBy = (filter) => { const set = new Set(); for (const i of idx) if (filter(i)) set.add(S.ro[i]); return set.size; };
  const sumBy = (filter, arr) => { let v = 0; for (const i of idx) if (filter(i)) v += (arr || S.net)[i]; return v; };
  const vehBy = (filter) => { const set = new Set(); for (const i of idx) if (filter(i) && S.vin[i] >= 0) set.add(S.vin[i]); return set.size; };
  const actSm = a => C.summarize(S, Array.from(idx).filter(i => S.act[i] === a));
  const em = actSm(0), bs = actSm(1), comb = C.summarize(S, Array.from(idx).filter(i => S.act[i] !== 2));
  // units
  const units = new Map();
  for (const i of idx) { const u = S.unit[i]; let o = units.get(u); if (!o) { o = { ui: u, name: S.units[u], branch: S.branches[S.unitBranch[u]], scope: S.unitScope[u], rev: 0, ros: new Set(), actRev: 0, actRos: new Set() }; units.set(u, o); } o.rev += S.net[i]; o.ros.add(S.ro[i]); if (S.act[i] === (o.scope === 'BS' ? 1 : 0)) { o.actRev += S.net[i]; o.actRos.add(S.ro[i]); } }
  const tg = new Map(ach.rows.map(r => [r.ui, r]));
  for (const o of units.values()) { const r = tg.get(o.ui); o.target = r ? r.target : 0; o.ros = o.ros.size; o.actRos = o.actRos.size; o.revPerRo = o.actRos ? o.actRev / o.actRos : NaN; }
  // bands: weeks 1..5 for one month, months for a longer period
  const single = ym === ye, dm = C.daysInMonth(ym);
  const weeks = single ? [0, 1, 2, 3, 4].map(k => ({ k, from: k * 7 + 1, to: Math.min(dm, k * 7 + 7), rev: 0, ros: new Set(), veh: new Set() })).filter(w => w.from <= dm) : (() => { const a = []; for (let m = ym, k = 0; m <= ye; m = C.ymAdd(m, 1), k++) a.push({ k, ym: m, label: ymLbl(m), rev: 0, ros: new Set(), veh: new Set() }); return a; })();
  const byDay = new Map();
  for (const i of idx) { const d = S.day[i] % 100, w = single ? weeks[Math.min(weeks.length - 1, Math.floor((d - 1) / 7))] : weeks.find(x => x.ym === S.ym[i]); if (!w) continue; w.rev += S.net[i]; w.ros.add(S.ro[i]); if (S.vin[i] >= 0) w.veh.add(S.vin[i]); byDay.set(S.day[i], (byDay.get(S.day[i]) || 0) + S.net[i]); }
  weeks.forEach(w => { w.ros = w.ros.size; w.veh = w.veh.size; });
  const billDays = [...byDay.keys()].sort((a, b) => a - b), lastYm = Math.floor((billDays[billDays.length - 1] || 0) / 100), last3 = billDays.filter(d => Math.floor(d / 100) === lastYm).slice(-3), monthEnd = last3.reduce((t2, d) => t2 + byDay.get(d), 0);
  // models
  const models = new Map();
  for (const i of idx) { const m = S.model[i]; let o = models.get(m); if (!o) { o = { name: S.models[m], rev: 0, ent: new Set() }; models.set(m, o); } o.rev += S.net[i]; if (S.act[i] !== 2) o.ent.add(S.ro[i]); }
  for (const o of models.values()) o.ent = o.ent.size;
  // advisors by unit scope (EM / BS separately), aggregated across branches
  const advs = { 0: new Map(), 1: new Map() };
  for (const i of idx) { const a = S.act[i]; if (a === 2) continue; const m = advs[a]; let o = m.get(S.adv[i]); if (!o) { o = { name: S.advs[S.adv[i]], rev: 0, ros: new Set(), br: new Set() }; m.set(S.adv[i], o); } o.rev += S.net[i]; o.ros.add(S.ro[i]); o.br.add(S.br[i]); }
  for (const m of Object.values(advs)) for (const o of m.values()) { o.ros = o.ros.size; o.nbr = o.br.size; }
  return {
    ym, ye, single, sm, ach, days, wd: days.wd, cd: days.cd, t,
    cashRos: roBy(i => S.cw[i] === 0 && S.act[i] !== 2), warRos: roBy(i => S.cw[i] === 1), pdiRev: sm.payer[2],
    em, bs, comb, units, weeks, monthEnd, last3, models, advs,
  };
}
function frLabel(s0, e0) {
  const n = (Math.floor(e0 / 100) * 12 + e0 % 100) - (Math.floor(s0 / 100) * 12 + s0 % 100) + 1, y = Math.floor(e0 / 100), m = s0 % 100;
  if (n === 1) return frMonth(s0);
  if (n === 3 && Math.floor(s0 / 100) === y && [1, 4, 7, 10].includes(m)) return `Q${(m + 2) / 3}-${y}`;
  if (n === 6 && Math.floor(s0 / 100) === y && [1, 7].includes(m)) return `H${m === 1 ? 1 : 2}-${y}`;
  if (n === 12 && m === 1 && Math.floor(s0 / 100) === y) return `Year ${y}`;
  return `${ymLbl(s0)} – ${ymLbl(e0)}`;
}
function frRange(end, n) { const s0 = C.ymAdd(end, -(n - 1)), pe = C.ymAdd(s0, -1), ps = C.ymAdd(pe, -(n - 1)); return { cs: s0, ce: end, ps, pe }; }
function frData(r) { const single = r.cs === r.ce; return { cur: frStats(r.cs, r.ce), prev: frStats(r.ps, r.pe), curYm: r.ce, prevYm: r.pe, single, curL: frLabel(r.cs, r.ce), prevL: frLabel(r.ps, r.pe), curS: single ? MON[r.ce % 100 - 1] : frLabel(r.cs, r.ce), prevS: single ? MON[r.pe % 100 - 1] : frLabel(r.ps, r.pe) }; }

/* ---------- slide parts ---------- */
function frFrame(R, n, title, sub, D) {
  R.slide(null);
  const K = FR.K;
  R.text(title.toUpperCase(), 0.5, 0.32, 10.6, 0.45, { size: fitSize(title.toUpperCase(), 10.6, 20, true, 14), bold: true, color: K.black, valign: 'middle' });
  if (sub) R.text(sub, 0.5, 0.8, 11.4, 0.3, { size: 11, color: K.grey });
  const lg = A._frLogo; if (lg && lg.black) R.image({ data: lg.black, key: 'logo-black' }, FR.W - 0.5 - 0.42 * lg.ratio, 0.3, 0.42 * lg.ratio, 0.42);
  R.line(0.5, 7.0, FR.W - 0.5, 7.0, { color: K.pgrey, w: 0.75 });
  R.text(String(n), 0.5, 7.05, 1.0, 0.3, { size: 9, color: K.grey });
  R.text(`${D.curL} vs ${D.prevL} · like for like`, 3.5, 7.05, 6.33, 0.3, { size: 9, color: K.grey, align: 'center' });
  R.text('Confidential C', FR.W - 2.5, 7.05, 2.0, 0.3, { size: 9, color: K.grey, align: 'right' });
}
function frInsight(R, lines, y) {
  const K = FR.K; y = y || 5.95; const h = 0.82;
  R.rect(0.5, y, FR.W - 1, h, { fill: K.box, r: 0.12 });
  R.rect(0.68, y + 0.13, 0.9, 0.24, { fill: K.yellow, r: 0.05 });
  R.text('INSIGHT', 0.68, y + 0.13, 0.9, 0.24, { size: 9, bold: true, color: K.black, align: 'center' });
  const szAll = Math.min(...lines.slice(0, 2).map(l => fitSize(`${l[0]}: ${l[1]}`, 10.7, 11, false, 7.5)));
  lines.slice(0, 2).forEach((l, k) => { const sz = szAll; R.text([{ t: l[0] + ': ', bold: true, size: sz }, { t: l[1], size: sz }], 1.75, y + 0.1 + k * 0.32, 10.95, 0.3, { size: sz, color: K.black, wrap: false }); });
}
function frRemark(R, t) { R.text(t, 0.5, 6.78, FR.W - 1, 0.22, { size: fitSize(t, FR.W - 1, 9, false, 7), italic: true, color: FR.K.grey }); }
function frPill(R, x, y, w, ch) { const K = FR.K; const bg = ch.c === K.green ? 'E3F2E7' : ch.c === K.red ? 'FBE3E5' : 'ECECEC'; R.rect(x, y, w, 0.24, { fill: bg, r: 0.11 }); R.text(ch.t, x, y, w, 0.24, { size: fitSize(ch.t, w - 0.06, 9, true, 7), bold: true, color: ch.c, align: 'center' }); }
/* horizontal pair of bars: previous (dotted) above current (solid) */
function frPair(R, x, y, w, h, pv, cv, max, o) {
  o = o || {}; const K = FR.K, bh = h * 0.42, gap = h * 0.08;
  if (!Number.isFinite(pv)) pv = 0; if (!Number.isFinite(cv)) cv = 0; if (!Number.isFinite(max)) max = 0;
  const pw = max > 0 ? Math.max(0, pv) / max * w : 0, cw = max > 0 ? Math.max(0, cv) / max * w : 0;
  if (pw > 0.01) R.image(dotted(pw, bh), x, y, pw, bh);
  if (o.pl) R.text(o.pl, x + pw + 0.05, y - 0.02, 2.2, bh + 0.04, { size: o.ps || 8, color: K.grey, wrap: false });
  if (cw > 0.005) R.rect(x, y + bh + gap, cw, bh, { fill: o.col || K.yellow });
  if (o.cl) R.text(o.cl, x + cw + 0.05, y + bh + gap - 0.02, o.clw || 3, bh + 0.04, { size: o.cs || 9, bold: true, color: o.clc || K.black, wrap: false });
}
function frKey(R, x, y, items) { let cx = x; for (const it of items) { if (it.type === 'dot') R.image(dotted(0.3, 0.13), cx, y + 0.06, 0.3, 0.13); else if (it.type === 'line') R.line(cx, y + 0.125, cx + 0.3, y + 0.125, { color: FR.K.black, dash: true, w: 1 }); else R.rect(cx, y + 0.06, 0.3, 0.13, { fill: it.color }); R.text(it.t, cx + 0.36, y, 2.4, 0.25, { size: 9, color: FR.K.muted, wrap: false }); cx += 0.42 + estW(it.t, 9) + 0.25; } }

/* ---------- slides ---------- */
function frSlides(R, D) {
  const K = FR.K, c = D.cur, p = D.prev, cm = D.curS, pm = D.prevS;
  const wdTxt = (x, y) => `${Number.isFinite(x.wd) ? x.wd : 'n/a'} / ${Number.isFinite(y.wd) ? y.wd : 'n/a'}`;
  const perWd = (v, s) => v / s.wd, perCd = (v, s) => v / s.cd;
  /* 1 cover */
  R.slide(frBackground());
  const lg = A._frLogo; if (lg && lg.white) R.image({ data: lg.white, key: 'logo-white' }, 0.75, 0.6, 0.62 * lg.ratio, 0.62);
  R.text('Egyptian International Motors', 0.75, 2.55, 9, 0.45, { size: 18, color: K.white });
  R.text('RENAULT AFTER-SALES', 0.75, 3.0, 10, 0.7, { size: 30, bold: true, color: K.white });
  R.text(D.curL, 0.75, 3.75, 9, 0.45, { size: 18, color: K.yellow });
  R.text(`Compared with ${D.prevL} · Like for like · working days ${wdTxt(c, p)} · calendar days ${c.cd} / ${p.cd}`, 0.75, 4.3, 11, 0.3, { size: 11, color: K.pgrey });
  /* 2 agenda */
  frFrame(R, 2, 'Agenda', '', D);
  const items = ['Headline figures', 'Achievement & budget', 'Revenue by payer', 'Revenue per repair order', 'Revenue change per day', 'Discounts', 'Billing trends by the week', 'Revenue & entries by model', 'Service advisors'];
  items.forEach((t, k) => { const col = k < 5 ? 0 : 1, row = col ? k - 5 : k, x = 0.9 + col * 6.1, y = 1.45 + row * 0.95; R.text(String(k + 1).padStart(2, '0'), x, y, 0.9, 0.6, { size: 30, bold: true, color: K.yellow }); R.text(t.toUpperCase(), x + 1.0, y, 4.8, 0.6, { size: 14, bold: true, color: K.black }); });
  /* 3 headline figures */
  frFrame(R, 3, 'Headline figures', `${cm} against ${pm}; pills show the change on ${pm}`, D);
  const card = (k, title, big, rows) => {
    const col = k % 3, row = Math.floor(k / 3), x = 0.5 + col * 4.14, y = 1.25 + row * 2.78, w = 3.98, h = 2.62;
    R.rect(x, y, w, h, { fill: K.white, line: K.pgrey, r: 0.12 });
    R.text(String(k + 1).padStart(2, '0'), x + 0.2, y + 0.14, 0.5, 0.3, { size: 14, bold: true, color: K.yellow });
    R.text(title, x + 0.68, y + 0.14, w - 0.85, 0.3, { size: fitSize(title, w - 0.85, 10, true, 7), bold: true, color: K.muted });
    const bigTxt = big.map(b => b.t).join(' · '), bs = fitSize(bigTxt, w - 0.4, 20, true, 11);
    R.text(big.flatMap((b, i) => (i ? [{ t: ' · ', color: K.grey, size: bs }, { t: b.t, color: K.blue, size: bs }] : [{ t: b.t, color: K.black, size: bs }])), x + 0.2, y + 0.5, w - 0.4, 0.5, { size: bs, bold: true });
    rows.slice(0, 4).forEach((r, i) => { const ry = y + 1.12 + i * 0.36;
      if (r[3]) { const full = r[0] + ' ' + r[1], sz = fitSize(full, w - 1.2, 9, false, 6); R.text([{ t: r[0] + ' ', color: K.grey, size: sz }, { t: r[1], bold: true, color: K.black, size: sz }], x + 0.2, ry, w - 1.2, 0.3, { size: sz, wrap: false }); }
      else { R.text(r[0], x + 0.2, ry, 1.75, 0.3, { size: fitSize(r[0], 1.75, 9, false, 6.5), color: K.grey }); R.text(r[1], x + 1.95, ry, 1.15, 0.3, { size: fitSize(r[1], 1.15, 10, true, 6.5), bold: true, color: K.black }); }
      if (r[2]) frPill(R, x + w - 0.88, ry + 0.03, 0.74, r[2]); });
  };
  const cs = c.sm, ps = p.sm;
  card(0, 'REVENUE & ACHIEVEMENT', [{ t: frE(cs.rev) }, { t: frP(c.ach.ach) }], [[`${cm} target`, frE(c.ach.target)], [`${pm} revenue`, `${frE(ps.rev)} - ${frP(p.ach.ach)} of ${frE(p.ach.target)}`, frChg(cs.rev, ps.rev), true], ['Per working day', frE(perWd(cs.rev, c)), frChg(perWd(cs.rev, c), perWd(ps.rev, p))]]);
  card(1, 'CUSTOMER-PAY REVENUE', [{ t: frE(cs.payer[0]) }], [[`${pm} customer-pay`, frE(ps.payer[0]), frChg(cs.payer[0], ps.payer[0])], ['Customer-pay ROs', `${frN(c.cashRos)} vs ${frN(p.cashRos)}`, frChg(c.cashRos, p.cashRos)], ['Per working day', frE(perWd(cs.payer[0], c)), frChg(perWd(cs.payer[0], c), perWd(ps.payer[0], p))], ['Share of revenue', frP(cs.payer[0] / cs.rev), frPts(cs.payer[0] / cs.rev, ps.payer[0] / ps.rev)]]);
  card(2, 'WARRANTY REVENUE', [{ t: frE(cs.payer[1]) }], [[`${pm} warranty`, frE(ps.payer[1]), frChg(cs.payer[1], ps.payer[1])], ['Warranty ROs', `${frN(c.warRos)} vs ${frN(p.warRos)}`, frChg(c.warRos, p.warRos)], ['Per working day', frE(perWd(cs.payer[1], c)), frChg(perWd(cs.payer[1], c), perWd(ps.payer[1], p))]]);
  card(3, 'REPAIR ORDERS & VEHICLES', [{ t: `${frN(cs.ros)} ROs` }, { t: `${frN(cs.vins)} cars` }], [[`${pm} ROs`, frN(ps.ros), frChg(cs.ros, ps.ros)], [`${pm} vehicles`, frN(ps.vins), frChg(cs.vins, ps.vins)], ['ROs per working day', frN(perWd(cs.ros, c)), frChg(perWd(cs.ros, c), perWd(ps.ros, p))], ['Cars per working day', frN(perWd(cs.vins, c)), frChg(perWd(cs.vins, c), perWd(ps.vins, p))]]);
  card(4, 'REVENUE PER RO & PER VEHICLE', [{ t: frEi(cs.revPerRo) }, { t: frEi(cs.revPerVin) }], [[`${pm} per RO`, frEi(ps.revPerRo), frChg(cs.revPerRo, ps.revPerRo)], [`${pm} per vehicle`, frEi(ps.revPerVin), frChg(cs.revPerVin, ps.revPerVin)], ['ROs per vehicle', `${(cs.ros / cs.vins).toFixed(2)} vs ${(ps.ros / ps.vins).toFixed(2)}`, frChg(cs.ros / cs.vins, ps.ros / ps.vins)]]);
  card(5, 'REVENUE PER RO: EM & BS', [{ t: `EM ${frEi(c.em.revPerRo)}` }, { t: `BS ${frEi(c.bs.revPerRo)}` }], [[`EM ${pm}`, frEi(p.em.revPerRo), frChg(c.em.revPerRo, p.em.revPerRo)], [`BS ${pm}`, frEi(p.bs.revPerRo), frChg(c.bs.revPerRo, p.bs.revPerRo)], ['EM ROs', `${frN(c.em.ros)} vs ${frN(p.em.ros)}`, frChg(c.em.ros, p.em.ros)], ['BS ROs', `${frN(c.bs.ros)} vs ${frN(p.bs.ros)}`, frChg(c.bs.ros, p.bs.ros)]]);
  /* 4 achievement & budget */
  frFrame(R, 4, 'Achievement & budget', '', D);
  frKey(R, 6.6, 0.85, [{ type: 'dot', t: `${pm} achievement` }, { color: K.yellow, t: `${cm} achievement` }, { type: 'line', t: '100% target' }]);
  const uList = [...c.units.values()].filter(u => u.target > 0 || u.rev).sort((a, b) => b.rev - a.rev);
  const pU = new Map([...p.units.values()].map(u => [u.name, u]));
  const brMap = (s) => { const m = new Map(); for (const u of s.units.values()) { const o = m.get(u.branch) || { name: u.branch, rev: 0, target: 0 }; o.rev += u.rev; o.target += u.target; m.set(u.branch, o); } return m; };
  const bC = brMap(c), bP = brMap(p), bList = [...bC.values()].sort((a, b) => b.rev - a.rev);
  const achCol = (x0, y0, w0, rows, heading) => {
    R.text(heading, x0, y0, w0, 0.26, { size: 9, bold: true, color: K.muted });
    const n = rows.length, rh = Math.min(0.42, 4.25 / Math.max(1, n)), nameW = 1.55, bx = x0 + nameW, bw = w0 - nameW - 1.9;
    const maxA = Math.max(1.2, ...rows.map(r => Math.max(r.ca || 0, r.pa || 0)));
    const scale = bw / maxA;
    rows.forEach((r, k) => {
      const y = y0 + 0.32 + k * rh;
      R.text(r.name, x0, y, nameW - 0.05, rh * 0.55, { size: fitSize(r.name, nameW - 0.05, 9, true, 6.5), bold: true });
      const g = frChg(r.rev, r.prev);
      R.text(g.t, x0, y + rh * 0.5, nameW - 0.05, rh * 0.42, { size: 7.5, color: g.c });
      frPair(R, bx, y + rh * 0.08, bw, rh * 0.8, (r.pa || 0) * maxA, (r.ca || 0) * maxA, maxA * maxA, { pl: Number.isFinite(r.pa) ? frP(r.pa) : '', cl: Number.isFinite(r.ca) ? `${frP(r.ca)} (${frM(r.rev)}/${frM(r.target)})` : `${frM(r.rev)} · no target`, clc: Number.isFinite(r.ca) ? frAchCol(r.ca) : K.grey, ps: 7, cs: fitSize('167.6% (5.23M/3.12M)', 1.85, 8.5, true, 6.5), clw: 2.0 });
    });
    const lx = bx + scale * 1;
    R.line(lx, y0 + 0.3, lx, y0 + 0.32 + n * rh, { color: K.black, dash: true, w: 1 });
  };
  achCol(0.5, 1.25, 6.05, uList.map(u => { const pu = pU.get(u.name); return { name: u.name, rev: u.rev, prev: pu ? pu.rev : NaN, target: u.target, ca: u.target > 0 ? u.rev / u.target : NaN, pa: pu && pu.target > 0 ? pu.rev / pu.target : NaN }; }), 'BY UNIT · EM AND BS SEPARATE · SORTED BY REVENUE');
  achCol(6.85, 1.25, 6.0, bList.map(b => { const pb = bP.get(b.name); return { name: b.name, rev: b.rev, prev: pb ? pb.rev : NaN, target: b.target, ca: b.target > 0 ? b.rev / b.target : NaN, pa: pb && pb.target > 0 ? pb.rev / pb.target : NaN }; }), 'BY BRANCH · EM AND BS COMBINED · SORTED BY REVENUE');
  const below = uList.filter(u => u.target > 0 && C.roundPct(u.rev / u.target) < 100), beat = bList.filter(b => b.target > 0 && C.roundPct(b.rev / b.target) >= 100);
  const bottom = bList.filter(b => b.target > 0).sort((a, b) => a.rev / a.target - b.rev / b.target).slice(0, 3);
  frInsight(R, [['By unit', `${below.length} of ${uList.filter(u => u.target > 0).length} units below target${below.length ? ` (${below.map(u => `${u.name} ${frP(u.rev / u.target)}`).join(', ')})` : ''}; top three ${uList.filter(u => u.target > 0).sort((a, b) => b.rev / b.target - a.rev / a.target).slice(0, 3).map(u => `${u.name} ${frP(u.rev / u.target)}`).join(', ')}.`], ['By branch', `${beat.length} of ${bList.filter(b => b.target > 0).length} branches beat budget; bottom three ${bottom.map(b => `${b.name} ${frP(b.rev / b.target)}`).join(', ')}.`]]);
  frRemark(R, `Labels: ${cm} achievement (revenue / target). Green = at or above target, red = below. Achievement is rounded to 0.1%.`);
  /* 5 revenue by payer */
  frFrame(R, 5, 'Revenue by payer', 'EGP millions, month totals', D);
  frKey(R, 0.5, 1.2, [{ type: 'dot', t: D.prevL }, { color: K.yellow, t: D.curL }]);
  const pay = [['Customer-pay', cs.payer[0], ps.payer[0]], ['Warranty', cs.payer[1], ps.payer[1]], ['PDI', cs.payer[2], ps.payer[2]]];
  const pmax = Math.max(...pay.map(x => Math.max(x[1], x[2])), 1);
  pay.forEach((x, k) => { const y = 1.7 + k * 1.3; R.text(x[0], 0.5, y, 1.7, 0.9, { size: 12, bold: true }); frPair(R, 2.2, y, 4.6, 0.9, x[2], x[1], pmax, { pl: (x[2] / 1e6).toFixed(2), cl: (x[1] / 1e6).toFixed(2), ps: 10, cs: 12 }); });
  R.text('SHARE OF REVENUE', 8.3, 1.2, 4.5, 0.3, { size: 9, bold: true, color: K.muted });
  pay.forEach((x, k) => { const y = 1.7 + k * 1.3; R.text(x[0], 8.3, y, 2, 0.3, { size: 10, bold: true, color: K.muted }); R.text(frP(x[1] / cs.rev), 8.3, y + 0.3, 1.9, 0.55, { size: 26, bold: true }); R.text(`${pm} ${frP(x[2] / ps.rev)}`, 10.2, y + 0.3, 1.4, 0.55, { size: 10, color: K.grey }); frPill(R, 11.7, y + 0.45, 0.95, frChg(x[1], x[2])); });
  frInsight(R, [['Month', `customer-pay ${frE(cs.payer[0])} (${frChg(cs.payer[0], ps.payer[0]).t}), warranty ${frE(cs.payer[1])} (${frChg(cs.payer[1], ps.payer[1]).t}).`], ['Per working / calendar day', `customer-pay ${frChg(perWd(cs.payer[0], c), perWd(ps.payer[0], p)).t} / ${frChg(perCd(cs.payer[0], c), perCd(ps.payer[0], p)).t}; warranty ${frChg(perWd(cs.payer[1], c), perWd(ps.payer[1], p)).t} / ${frChg(perCd(cs.payer[1], c), perCd(ps.payer[1], p)).t}.`]]);
  /* 6 revenue per RO */
  frFrame(R, 6, 'Revenue per repair order', `EGP per RO, ${pm} vs ${cm}: mechanical (EM) and body shop (BS)`, D);
  const rpoCol = (x0, scope, label, sC, sP) => {
    const g = frChg(sC.revPerRo, sP.revPerRo);
    R.text([{ t: `${label} · ${scope === 'EM' ? 'OVERALL ' : ''}EGP ${frN(sP.revPerRo)} → ${frN(sC.revPerRo)} `, color: K.muted }, { t: `(${g.t})`, color: g.c }], x0, 1.2, 6, 0.3, { size: 9.5, bold: true });
    const rows = [...c.units.values()].filter(u => u.scope === scope && u.actRos).sort((a, b) => b.revPerRo - a.revPerRo);
    const n = rows.length, rh = Math.min(0.5, 4.3 / Math.max(1, n)), max = Math.max(...rows.map(u => Math.max(u.revPerRo, (pU.get(u.name) || {}).revPerRo || 0)), 1);
    rows.forEach((u, k) => { const y = 1.6 + k * rh, pu = pU.get(u.name), pv = pu ? pu.revPerRo : NaN, ch = frChg(u.revPerRo, pv); R.text(u.branch, x0, y, 1.5, rh * 0.55, { size: fitSize(u.branch, 1.5, 9, true, 6.5), bold: true }); R.text(ch.t, x0, y + rh * 0.5, 1.5, rh * 0.42, { size: 7.5, color: ch.c }); frPair(R, x0 + 1.55, y + rh * 0.08, 3.4, rh * 0.8, pv, u.revPerRo, max, { pl: frN(pv), cl: frN(u.revPerRo), ps: 7, cs: 8.5 }); });
    return rows;
  };
  const emR = rpoCol(0.5, 'EM', 'MECHANICAL (EM)', c.em, p.em), bsR = rpoCol(6.85, 'BS', 'BODY SHOP (BS)', c.bs, p.bs);
  const rose = emR.concat(bsR).filter(u => { const pu = pU.get(u.name); return pu && u.revPerRo > pu.revPerRo; });
  frInsight(R, [['Units', `${rose.length} of ${emR.length + bsR.length} units raised revenue per RO; EM average ${frEi(c.em.revPerRo)} (${frChg(c.em.revPerRo, p.em.revPerRo).t}), BS ${frEi(c.bs.revPerRo)} (${frChg(c.bs.revPerRo, p.bs.revPerRo).t}).`], ['Highest', `${emR.slice(0, 2).map(u => `${u.name} ${frEi(u.revPerRo)}`).join(', ')}${bsR[0] ? `; ${bsR[0].name} ${frEi(bsR[0].revPerRo)}` : ''}. Revenue per RO reads the same per working day.`]]);
  /* 7 revenue change per day */
  frFrame(R, 7, 'Revenue change per day', `Per working day (${Number.isFinite(p.wd) ? p.wd : 'n/a'} → ${Number.isFinite(c.wd) ? c.wd : 'n/a'} days) and per calendar day (${p.cd} → ${c.cd} days), ${cm} vs ${pm}`, D);
  const divCol = (x0, title, fnC, fnP) => {
    R.text(title, x0, 1.2, 6, 0.3, { size: 9.5, bold: true, color: K.muted });
    const rows = uList.map(u => { const pu = pU.get(u.name); const a = fnC(u.rev), b = pu ? fnP(pu.rev) : NaN; return { name: u.name, d: Number.isFinite(a) && Number.isFinite(b) && b ? (a - b) / Math.abs(b) : NaN }; }).filter(r => Number.isFinite(r.d)).sort((a, b) => b.d - a.d);
    const n = rows.length, rh = Math.min(0.36, 4.35 / Math.max(1, n)), mid = x0 + 3.0, half = 1.7, mx = Math.max(0.01, ...rows.map(r => Math.abs(r.d)));
    R.line(mid, 1.55, mid, 1.6 + n * rh, { color: K.lgrey, w: 0.75 });
    rows.forEach((r, k) => { const y = 1.6 + k * rh, w = Math.abs(r.d) / mx * half, g = frChg(1 + r.d, 1); R.text(r.name, x0, y, 1.25, rh, { size: fitSize(r.name, 1.25, 8.5, true, 6.5), bold: true }); if (r.d >= 0) { R.rect(mid, y + rh * 0.2, w, rh * 0.6, { fill: K.blue }); R.text(g.t, mid + w + 0.05, y, 0.9, rh, { size: 8, bold: true, color: g.c }); } else { R.rect(mid - w, y + rh * 0.2, w, rh * 0.6, { fill: K.mag }); R.text(g.t, mid - w - 0.85, y, 0.8, rh, { size: 8, bold: true, color: g.c, align: 'right' }); } });
    return rows;
  };
  const wdRows = divCol(0.5, 'PER WORKING DAY', v => v / c.wd, v => v / p.wd), cdRows = divCol(6.85, 'PER CALENDAR DAY', v => v / c.cd, v => v / p.cd);
  frInsight(R, [['Per working day', `${wdRows.filter(r => r.d > 0).length} of ${wdRows.length} units grew; total revenue ${frChg(perWd(cs.rev, c), perWd(ps.rev, p)).t}, customer-pay ${frChg(perWd(cs.payer[0], c), perWd(ps.payer[0], p)).t}, ROs ${frChg(perWd(cs.ros, c), perWd(ps.ros, p)).t}.`], ['Per calendar day', `${cdRows.filter(r => r.d > 0).length} of ${cdRows.length} units grew; total revenue ${frChg(perCd(cs.rev, c), perCd(ps.rev, p)).t}, customer-pay ${frChg(perCd(cs.payer[0], c), perCd(ps.payer[0], p)).t}, ROs ${frChg(perCd(cs.ros, c), perCd(ps.ros, p)).t}.`]]);
  if (!Number.isFinite(c.wd) || !Number.isFinite(p.wd)) frRemark(R, 'Working days are missing for one of the months; upload both target reports.');
  /* 8 discounts */
  frFrame(R, 8, 'Discounts', `${pm} vs ${cm}: mechanical (EM), body shop (BS) and combined`, D);
  const grp = [['EM', c.em, p.em], ['BS', c.bs, p.bs], ['Combined', c.comb, p.comb]];
  const colChart = (x0, title, val, fmt, curCol, under) => {
    R.text(title, x0, 1.2, 4, 0.3, { size: 9.5, bold: true, color: K.muted });
    const base = 4.7, top = 1.85, hh = base - top, max = Math.max(...grp.map(g => Math.max(val(g[1]), val(g[2]))), 1e-9);
    R.line(x0, base, x0 + 3.9, base, { color: K.lgrey, w: 0.75 });
    grp.forEach((g, k) => { const gx = x0 + 0.15 + k * 1.28, bw = 0.5, pvv = val(g[2]), cvv = val(g[1]), ph = Math.max(0, pvv) / max * hh, chh = Math.max(0, cvv) / max * hh; if (ph > 0.01) R.image(dotted(bw, ph), gx, base - ph, bw, ph); R.text(fmt(pvv), gx - 0.15, base - ph - 0.25, bw + 0.3, 0.22, { size: 7.5, color: K.grey, align: 'center', wrap: false }); R.rect(gx + bw + 0.04, base - chh, bw, chh, { fill: curCol }); R.text(fmt(cvv), gx + bw - 0.11, base - chh - 0.25, bw + 0.3, 0.22, { size: 8, bold: true, align: 'center', wrap: false }); R.text(g[0], gx - 0.05, base + 0.04, 1.15, 0.24, { size: 9, bold: true, align: 'center' }); const u = under(g); R.text(u.map((z, i) => ({ t: z.t, color: z.c || K.grey, bold: i === 0, br: i < u.length - 1 })), gx - 0.1, base + 0.3, 1.25, 0.5, { size: 7.5, align: 'center', valign: 'top' }); });
  };
  colChart(0.5, 'DISCOUNT RATE', s => s.rate, v => frP(v), K.yellow, g => [frPts(g[1].rate, g[2].rate, true)]);
  colChart(4.75, 'DISCOUNTED REPAIR ORDERS', s => s.discRos, v => frN(v), K.blue, g => { const ch = frChg(g[1].discRos, g[2].discRos); return [{ t: ch.t, c: ch.c === K.green ? K.red : ch.c === K.red ? K.green : ch.c }, { t: `${frP(g[1].discRos / g[1].ros)} of ROs` }]; });
  colChart(9.0, 'DISCOUNT VALUE · EGP', s => s.disc, v => (v / 1e6).toFixed(2) + 'M', K.yellow, g => { const ch = frChg(g[1].disc, g[2].disc); return [{ t: ch.t, c: ch.c === K.green ? K.red : ch.c === K.red ? K.green : ch.c }]; });
  frInsight(R, [['Combined', `rate ${frP(c.comb.rate)} (${frPts(c.comb.rate, p.comb.rate, true).t}), ${frN(c.comb.discRos)} discounted ROs (${frChg(c.comb.discRos, p.comb.discRos).t}), value ${frE(c.comb.disc)} (${frChg(c.comb.disc, p.comb.disc).t}).`], ['EM / BS', `EM rate ${frP(c.em.rate)} (${frPts(c.em.rate, p.em.rate, true).t}), BS ${frP(c.bs.rate)} (${frPts(c.bs.rate, p.bs.rate, true).t}); discounted ROs per working day ${(c.comb.discRos / c.wd).toFixed(1)} vs ${(p.comb.discRos / p.wd).toFixed(1)}.`]], 5.55);
  frRemark(R, 'Remark: discount rate = discount value / gross revenue (net + discount). Discounted RO = repair order with at least one discounted line.');
  /* 9 billing trends by week */
  frFrame(R, 9, D.single ? 'Billing trends by the week' : 'Billing trends by the month', D.single ? 'Week 1 = days 1-7, week 2 = days 8-14 and so on; week 5 is the last two or three days' : 'Each month of the period against the same position in the previous period', D);
  frKey(R, 0.5, 1.15, [{ type: 'dot', t: D.prevL }, { color: K.yellow, t: D.curL }]);
  const nW = Math.max(c.weeks.length, p.weeks.length), wmax = Math.max(...c.weeks.map(w => w.rev), ...p.weeks.map(w => w.rev), 1), bandH = Math.min(0.85, 4.25 / nW);
  for (let k = 0; k < nW; k++) {
    const cw2 = c.weeks[k] || { rev: 0, ros: 0, veh: 0, from: k * 7 + 1, to: k * 7 + 7 }, pw2 = p.weeks[k] || { rev: 0, ros: 0, veh: 0 }, y = 1.55 + k * bandH;
    R.text(D.single ? `Week ${k + 1}` : (cw2.label || ''), 0.5, y, 1.1, bandH * 0.5, { size: 10, bold: true }); R.text(D.single ? `days ${cw2.from}-${cw2.to}` : (pw2.label ? `vs ${pw2.label}` : ''), 0.5, y + bandH * 0.45, 1.1, bandH * 0.4, { size: 7.5, color: K.grey });
    const bw = 3.6, bh = bandH * 0.34, ppw = pw2.rev / wmax * bw, ccw = cw2.rev / wmax * bw;
    if (ppw > 0.01) R.image(dotted(ppw, bh), 1.65, y + 0.04, ppw, bh);
    R.text([{ t: `${frM(pw2.rev)} (`, color: K.grey }, { t: 'RO: ', color: K.blue }, { t: `${frN(pw2.ros)}, `, color: K.grey }, { t: 'Veh: ', color: K.mag }, { t: `${frN(pw2.veh)})`, color: K.grey }], 1.65 + ppw + 0.05, y + 0.02, 3.4, bh + 0.04, { size: 7.5, wrap: false });
    if (ccw > 0.01) R.rect(1.65, y + bh + 0.1, ccw, bh, { fill: K.yellow });
    R.text([{ t: `${frM(cw2.rev)} (`, bold: true }, { t: 'RO: ', color: K.blue, bold: true }, { t: `${frN(cw2.ros)}, `, bold: true }, { t: 'Veh: ', color: K.mag, bold: true }, { t: `${frN(cw2.veh)})`, bold: true }], 1.65 + ccw + 0.05, y + bh + 0.08, 3.6, bh + 0.04, { size: 8, wrap: false });
  }
  R.text(D.single ? 'SHARE OF THE MONTH' : 'SHARE OF THE PERIOD', 9.2, 1.15, 3.6, 0.3, { size: 9, bold: true, color: K.muted });
  for (let k = 0; k < nW; k++) { const cw2 = c.weeks[k], pw2 = p.weeks[k], y = 1.55 + k * bandH; R.text(D.single ? `W${k + 1}` : MON[(cw2 ? cw2.ym : 1) % 100 - 1] || '', 9.2, y, 0.6, bandH * 0.8, { size: 10, bold: true, color: K.muted }); R.text(cw2 ? frP(cw2.rev / cs.rev) : '—', 9.8, y, 1.6, bandH * 0.8, { size: Math.min(24, bandH * 34), bold: true }); R.text(pw2 ? `${pm} ${frP(pw2.rev / ps.rev)}` : '', 11.4, y, 1.5, bandH * 0.8, { size: 9, color: K.grey }); }
  frInsight(R, [[D.single ? 'Weekly share' : 'Monthly share', `${cm} ${c.weeks.map(w => frP(w.rev / cs.rev)).join(' / ')} · ${pm} ${p.weeks.map(w => frP(w.rev / ps.rev)).join(' / ')}.`], ['Month-end', `the last three billing days of the last month carried ${frP(c.monthEnd / cs.rev)} of ${cm} revenue (${pm} ${frP(p.monthEnd / ps.rev)}).`]]);
  frRemark(R, 'Note: RO = repair order (repair orders billed in the week); Veh = distinct vehicles billed in the week.');
  /* 10 models */
  frFrame(R, 10, 'Revenue and car entries by model', `${pm} vs ${cm}; car entries are repair orders (PDI excluded)`, D);
  const pMod = new Map([...p.models.values()].map(m => [m.name, m]));
  const modCol = (x0, title, key, col, fmt) => {
    R.text(title, x0, 1.2, 6, 0.3, { size: 9.5, bold: true, color: K.muted });
    const rows = [...c.models.values()].sort((a, b) => b[key] - a[key]).slice(0, 12), n = rows.length, rh = Math.min(0.4, 4.3 / Math.max(1, n));
    const max = Math.max(...rows.map(m => Math.max(m[key], (pMod.get(m.name) || {})[key] || 0)), 1);
    rows.forEach((m, k) => { const y = 1.6 + k * rh, pmv = (pMod.get(m.name) || {})[key] || 0, ch = frChg(m[key], pmv); R.text(m.name, x0, y, 1.7, rh * 0.55, { size: fitSize(m.name, 1.7, 8.5, true, 6), bold: true }); R.text(ch.t, x0, y + rh * 0.5, 1.7, rh * 0.42, { size: 7, color: ch.c }); frPair(R, x0 + 1.75, y + rh * 0.08, 3.3, rh * 0.8, pmv, m[key], max, { pl: fmt(pmv), cl: fmt(m[key]), col, ps: 7, cs: 8 }); });
    return rows;
  };
  const mr = modCol(0.5, 'REVENUE BY MODEL · EGP MILLIONS', 'rev', K.yellow, v => (v / 1e6).toFixed(2)), me = modCol(6.85, 'CAR ENTRIES BY MODEL · REPAIR ORDERS', 'ent', K.blue, v => frN(v));
  const mch = [...c.models.values()].map(m => ({ name: m.name, d: m.rev - ((pMod.get(m.name) || {}).rev || 0), e: m.ent - ((pMod.get(m.name) || {}).ent || 0) }));
  const gains = mch.slice().sort((a, b) => b.d - a.d).slice(0, 2), falls = mch.slice().sort((a, b) => a.d - b.d).slice(0, 2);
  const entC = [...c.models.values()].reduce((t, m) => t + m.ent, 0), entP = [...p.models.values()].reduce((t, m) => t + m.ent, 0);
  frInsight(R, [['Revenue', `biggest gains ${gains.map(g => `${g.name} ${g.d >= 0 ? '+' : ''}${frM(g.d)}`).join(', ')}; biggest falls ${falls.map(g => `${g.name} ${frM(g.d)}`).join(', ')}.`], ['Entries', `${frN(entC)} car entries (${frChg(entC, entP).t}); more cars ${mch.slice().sort((a, b) => b.e - a.e).slice(0, 2).map(g => `${g.name} +${frN(g.e)}`).join(', ')}; per working day ${(entC / c.wd).toFixed(0)} vs ${(entP / p.wd).toFixed(0)}.`]]);
  /* 11 advisors */
  frFrame(R, 11, 'Service advisors across all branches', "Each advisor's work added up across all branches: repair orders left of the name, revenue right", D);
  const fly = (x0, w0, title, a, top) => {
    R.text(title, x0, 1.2, w0, 0.3, { size: 9.5, bold: true, color: K.muted, align: 'center' });
    const pm2 = new Map([...p.advs[a].values()].map(o => [o.name, o]));
    const rows = [...c.advs[a].values()].sort((x, y) => y.rev - x.rev).slice(0, top), n = rows.length, rh = Math.min(0.32, 4.35 / Math.max(1, n));
    const nameW = 1.5, side = (w0 - nameW) / 2 - 0.05, cx = x0 + side + 0.05, maxRo = Math.max(...rows.map(o => Math.max(o.ros, (pm2.get(o.name) || {}).ros || 0)), 1), maxRev = Math.max(...rows.map(o => Math.max(o.rev, (pm2.get(o.name) || {}).rev || 0)), 1);
    const sw = side - 0.55;
    rows.forEach((o, k) => {
      const y = 1.58 + k * rh, po = pm2.get(o.name) || { ros: 0, rev: 0 }, bh = rh * 0.38;
      const nm = o.name + (o.nbr > 1 ? ` (${o.nbr} br)` : '');
      R.text(nm, cx, y, nameW, rh * 0.85, { size: fitSize(nm, nameW, 8, true, 5.5), bold: true, align: 'center' });
      const pr = po.ros / maxRo * sw, cr = o.ros / maxRo * sw;
      if (pr > 0.01) R.image(dotted(pr, bh), cx - pr, y + 0.02, pr, bh);
      R.rect(cx - cr, y + bh + 0.05, cr, bh, { fill: K.blue });
      R.text(frN(o.ros), cx - Math.max(cr, pr) - 0.5, y, 0.46, rh * 0.85, { size: 7, bold: true, align: 'right', wrap: false });
      const pv = po.rev / maxRev * sw, cv = o.rev / maxRev * sw, rx = cx + nameW;
      if (pv > 0.01) R.image(dotted(pv, bh), rx, y + 0.02, pv, bh);
      R.rect(rx, y + bh + 0.05, cv, bh, { fill: K.yellow });
      R.text(frM(o.rev), rx + Math.max(cv, pv) + 0.04, y, 0.6, rh * 0.85, { size: 7, bold: true, wrap: false });
    });
    const ch = rows.map(o => ({ name: o.name, d: o.rev - ((pm2.get(o.name) || {}).rev || 0) }));
    return { ch, grew: ch.filter(x => x.d > 0).length, n };
  };
  const fe = fly(0.4, 6.3, 'MECHANICAL (EM) · TOP 16', 0, 16), fb = fly(6.75, 6.15, 'BODY SHOP (BS) · TOP 12', 1, 12);
  const gl = (f) => `${f.ch.slice().sort((a, b) => b.d - a.d).slice(0, 2).map(x => `${x.name} +${frM(x.d)}`).join(', ')}; falls ${f.ch.slice().sort((a, b) => a.d - b.d).slice(0, 1).map(x => `${x.name} ${frM(x.d)}`).join(', ')}; ${f.grew} of ${f.n} grew`;
  frInsight(R, [['EM', gl(fe) + '.'], ['BS', gl(fb) + '.']]);
  /* 12 thank you */
  R.slide(frBackground());
  if (lg && lg.white) R.image({ data: lg.white, key: 'logo-white' }, 0.75, 0.6, 0.62 * lg.ratio, 0.62);
  R.text('THANK YOU', 0, 3.2, FR.W, 1.0, { size: 44, bold: true, color: K.white, align: 'center' });
}

/* ---------- fast report, budget-review template (the Renault "After-Sales Review" layout):
   photo cover and closing, agenda, six headline cards, achievement against budget, monthly revenue,
   payer, revenue per RO, discounts, monthly ROs & vehicles, models, advisors. Inter throughout. ---------- */
const FR_BG = /*FRBG*/{};
function frPeriodText(s0, e0) {
  const y0 = Math.floor(s0 / 100), y1 = Math.floor(e0 / 100), m0 = s0 % 100, m1 = e0 % 100, n = (y1 * 12 + m1) - (y0 * 12 + m0) + 1;
  const ytd = n > 1 && m0 === 1 && y0 === y1;
  const long = n === 1 ? frMonth(s0) : y0 === y1 ? `${FMON[m0 - 1]} – ${FMON[m1 - 1]} ${y1}${ytd ? ' (year to date)' : ''}` : `${frMonth(s0)} – ${frMonth(e0)}`;
  const short = n === 1 ? `${MON[m0 - 1]} ${y0}` : y0 === y1 ? `${MON[m0 - 1]}–${MON[m1 - 1]} ${y1}` : `${MON[m0 - 1]} ${y0}–${MON[m1 - 1]} ${y1}`;
  const kind = n === 1 ? 'Month' : ytd && n !== 12 && n !== 3 && n !== 6 ? 'Year to date' : n === 3 ? 'Quarter' : n === 6 ? 'Half year' : n === 12 ? 'Year' : 'Period';
  const tag = n === 1 ? `${MON[m0 - 1]} ${y0}` : ytd ? `YTD ${MON[m1 - 1]} ${y1}` : short;
  return { long, short, kind, n, ytd, tag };
}
function frBudgetData(cs, ce) {
  const S = A.S, c = frStats(cs, ce), P = frPeriodText(cs, ce);
  // months shown in the monthly charts: the period itself, or the last 6 months when the period is shorter than 3 months
  const m0 = P.n < 3 ? C.ymAdd(ce, -5) : cs, months = [];
  for (let m = m0; m <= ce; m = C.ymAdd(m, 1)) {
    const f = { s: m, e: m, branches: permittedSet(), act: 'all', noOW: !!(A.f.noOW && owDefined()) };
    const idx = C.select(S, f), sm = C.summarize(S, idx), ach = C.achievement(S, A.T, f);
    months.push({ ym: m, rev: sm.rev, target: ach.target, ach: ach.target > 0 ? sm.rev / ach.target : NaN, ros: sm.ros, vins: sm.vins, cash: sm.payer[0], has: A.coverage.has(m) });
  }
  const inP = months.filter(m => m.ym >= cs && m.has);
  return { c, P, months, inP, trend: P.n < 3 };
}
function frFrameB(R, n, title, sub, D) {
  R.slide(null);
  const K = FR.K;
  R.text(title.toUpperCase(), 0.26, 0.2, 11.2, 0.45, { size: fitSize(title.toUpperCase(), 11.2, 20, true, 14), bold: true, color: K.black, valign: 'middle' });
  if (sub) R.text(sub, 0.26, 0.62, 9.6, 0.26, { size: fitSize(sub, 9.6, 11, false, 8), color: K.grey });
  R.text(String(n), 0.1, 7.13, 0.8, 0.26, { size: 10, color: K.black });
  R.text(`${D.P.short} · performance against budget`, 3.5, 7.13, 6.33, 0.26, { size: 9, color: K.grey, align: 'center' });
  R.text('Confidential C', FR.W - 2.15, 7.13, 2.0, 0.26, { size: 10, color: K.black, align: 'right' });
}
function frInsightB(R, lines, y) {
  const K = FR.K; y = y || 6.0; const h = 0.78;
  R.rect(0.26, y, FR.W - 0.52, h, { fill: 'EDEDED', r: 0.08 });
  R.rect(0.4, y + 0.14, 0.82, 0.24, { fill: K.yellow, r: 0.1 });
  R.text('INSIGHT', 0.4, y + 0.14, 0.82, 0.24, { size: 9, bold: true, color: K.black, align: 'center' });
  const ls = lines.slice(0, 2), sz = Math.min(...ls.map(l => fitSize(`${l[0]}  ${l[1]}`, 11.4, 11, false, 7.5)));
  ls.forEach((l, k) => R.text([{ t: l[0] + '  ', bold: true, size: sz }, { t: l[1], size: sz }], 1.36, y + 0.08 + k * 0.21, 11.5, 0.22, { size: sz, color: K.black, wrap: false }));
}
function frRemarkB(R, t, y) { R.text(t, 0.26, y || 6.83, FR.W - 0.52, 0.22, { size: fitSize(t, FR.W - 0.52, 9, false, 7), italic: true, color: FR.K.grey }); }
function frPillB(R, x, y, w, t, good) { const K = FR.K; R.rect(x, y, w, 0.23, { fill: good ? '1E8E3E' : 'D0021B', r: 0.11 }); R.text(t, x, y, w, 0.23, { size: 8.5, bold: true, color: K.white, align: 'center' }); }
function frKeyB(R, x, y, items) { let cx = x; for (const it of items) { if (it.type === 'line') R.line(cx, y + 0.11, cx + 0.22, y + 0.11, { color: FR.K.black, dash: true, w: 1 }); else R.rect(cx, y + 0.04, 0.17, 0.13, { fill: it.color }); const tx = it.type === 'line' ? 0.3 : 0.24; R.text(it.t, cx + tx, y, 2.4, 0.22, { size: 9, color: FR.K.black, wrap: false }); cx += tx + estW(it.t, 9, false) + 0.34; } }
/* horizontal bar list: name (bold, right-aligned) with a grey line under it, a bar, and a label after the bar */
function frHBars(R, x0, y0, w0, h0, rows, o) {
  const K = FR.K, n = rows.length; if (!n) return;
  const rh = Math.min(o.maxRh || 0.42, h0 / n), nameW = o.nameW || 1.5, bx = x0 + nameW + 0.06, bw = w0 - nameW - 0.06 - (o.labW || 1.2);
  const max = o.max || Math.max(...rows.map(r => r.v || 0), 1e-9), bh = Math.min(rh * 0.62, o.bh || 0.2);
  rows.forEach((r, k) => {
    const y = y0 + k * rh, by = y + (rh - bh) / 2;
    if (o.zebra && k % 2 === 0) R.rect(x0 - 0.02, y, w0 + 0.04, rh, { fill: 'F7F7F7' });
    if (r.sub) { R.text(r.name, x0, by - 0.06, nameW, 0.18, { size: fitSize(r.name, nameW, 8.5, true, 6), bold: true, align: 'right', wrap: false }); R.text(r.sub, x0, by + 0.1, nameW, 0.15, { size: 7, color: K.grey, align: 'right', wrap: false }); }
    else R.text(r.name, x0, y, nameW, rh, { size: fitSize(r.name, nameW, o.ns || 8.5, true, 6), bold: true, align: 'right', wrap: false });
    const w = Math.max(0, r.v || 0) / max * bw;
    if (w > 0.004) R.rect(bx, by, w, bh, { fill: r.col || o.col || K.yellow });
    if (r.lab) R.text(r.lab, bx + w + 0.05, y, (o.labW || 1.2) + bw - w, rh, { size: o.ls || 8.5, wrap: false });
  });
  return { bx, bw, max, rh };
}
/* vertical columns */
function frCols(R, x0, base, w0, h0, cols, o) {
  const K = FR.K, n = cols.length; if (!n) return;
  const slot = w0 / n, bw = Math.min(o.bw || 0.78, slot * 0.56), max = o.max || Math.max(...cols.map(c => Math.max(c.v || 0, c.mark || 0)), 1e-9);
  R.line(x0, base, x0 + w0, base, { color: 'D0D0CE', w: 1 });
  cols.forEach((c, k) => {
    const cx = x0 + slot * k + slot / 2, h = Math.max(0, c.v || 0) / max * h0;
    if (h > 0.004) R.rect(cx - bw / 2, base - h, bw, h, { fill: c.col || o.col || K.yellow });
    const top = Math.max(h, c.mark ? c.mark / max * h0 : 0);
    if (c.mark) { const my = base - c.mark / max * h0; R.rect(cx - bw * 0.58, my - 0.015, bw * 1.16, 0.03, { fill: K.black }); }
    if (c.lab) R.text(c.lab, cx - slot / 2, base - top - 0.3, slot, 0.22, { size: o.ls || 9, bold: o.lb !== false, color: K.black, align: 'center', wrap: false });
    R.text(c.x, cx - slot / 2, base + 0.04, slot, 0.22, { size: o.xs || 9, bold: o.xb !== false, color: K.black, align: 'center', wrap: false });
    if (c.under) R.text(c.under, cx - slot / 2, base + 0.3, slot, 0.22, { size: 9, bold: !!c.ub, color: c.uc || K.grey, align: 'center', wrap: false });
  });
}
function frSlidesBudget(R, D) {
  const K = FR.K, c = D.c, s = c.sm, P = D.P, wd = c.wd, cd = c.cd, lg = A._frLogo;
  const perWd = v => (wd > 0 ? v / wd : NaN);
  const M2 = v => (Number.isFinite(v) ? (v / 1e6).toFixed(2) + 'M' : 'n/a');
  const units = [...c.units.values()].filter(u => u.target > 0 || u.rev);
  const brMap = new Map(); for (const u of units) { const o = brMap.get(u.branch) || { name: u.branch, rev: 0, target: 0 }; o.rev += u.rev; o.target += u.target; brMap.set(u.branch, o); }
  const brs = [...brMap.values()].sort((a, b) => b.rev - a.rev);
  /* 1 cover */
  R.slide(FR_BG.cover || frBackground(), 'cover');
  if (lg && lg.white) R.image({ data: lg.white, key: 'logo-white' }, 0.55, 0.52, 1.15 * lg.ratio, 1.15);
  R.text('Egyptian International Motors', 0.27, 2.92, 9, 0.36, { size: 17, color: K.white });
  R.text('RENAULT AFTER-SALES', 0.27, 3.38, 10, 0.5, { size: 28, bold: true, color: K.white });
  R.text(P.long, 0.27, 4.04, 10, 0.36, { size: 18, color: K.yellow });
  R.text(`${P.kind} · ${P.n} month${P.n > 1 ? 's' : ''} · working days ${Number.isFinite(wd) ? wd : 'n/a'} · calendar days ${cd}`, 0.27, 4.58, 10, 0.26, { size: 11, color: 'D9D9D6' });
  /* 2 agenda */
  frFrameB(R, 2, 'Agenda', '', D);
  const ag = ['Headline figures', 'Achievement & budget', 'Monthly revenue & achievement', 'Revenue by payer', 'Revenue per repair order', 'Discounts', 'Monthly repair orders & vehicles', 'Revenue & entries by model', 'Service advisors'];
  ag.forEach((t, k) => { const col = k < 5 ? 0 : 1, row = col ? k - 5 : k, x = 0.9 + col * 6.2, y = 1.48 + row * 0.95; R.text(String(k + 1).padStart(2, '0'), x, y, 0.95, 0.55, { size: 30, color: K.yellow, valign: 'middle' }); R.text(t.toUpperCase(), x + 0.95, y, 5.1, 0.55, { size: 14, bold: true, color: K.black, valign: 'middle' }); });
  /* 3 headline figures */
  frFrameB(R, 3, 'Headline figures', `${P.short}: totals for the ${P.n > 1 ? P.n + ' months' : 'month'}, against budget`, D);
  const card = (k, title, big, rows) => {
    const col = k % 3, row = Math.floor(k / 3), x = 0.26 + col * 4.32, y = 1.12 + row * 3.03, w = 4.17, h = 2.88;
    R.rect(x, y, w, h, { fill: K.white, line: 'D9D9D6', r: 0.1, lineW: 1 });
    R.text(String(k + 1).padStart(2, '0'), x + 0.2, y + 0.2, 0.5, 0.3, { size: 18, bold: true, color: K.yellow, valign: 'middle' });
    R.text(title, x + 0.7, y + 0.2, w - 0.85, 0.3, { size: fitSize(title, w - 0.85, 11, true, 7.5), bold: true, color: K.black, valign: 'middle' });
    const bigTxt = big.map(b => b.t).join(' · '), bs = fitSize(bigTxt, w - 0.4, 22, true, 12);
    R.text(big.flatMap((b, i) => (i ? [{ t: ' · ', color: K.lgrey, size: bs }, { t: b.t, color: K.blue, size: bs }] : [{ t: b.t, color: K.black, size: bs }])), x + 0.2, y + 0.62, w - 0.4, 0.5, { size: bs, bold: true, wrap: false });
    rows.slice(0, 4).forEach((r, i) => {
      const ry = y + 1.3 + i * 0.37, full = r[0] + '  ' + r[1], sz = fitSize(full, w - (r[2] ? 1.3 : 0.45), 10, false, 7);
      R.text([{ t: r[0] + '  ', color: K.grey, size: sz }, { t: r[1], bold: true, color: K.black, size: sz }], x + 0.2, ry, w - 0.4, 0.28, { size: sz, wrap: false, valign: 'middle' });
      if (r[2]) frPillB(R, x + w - 1.0, ry + 0.025, 0.82, r[2].t, r[2].good);
      if (i < rows.length - 1) R.line(x + 0.2, ry + 0.33, x + w - 0.2, ry + 0.33, { color: 'E2E2E0', w: 0.5 });
    });
  };
  const ach = c.ach, gap = s.rev - ach.target, onT = D.inP.filter(m => Number.isFinite(m.ach) && C.roundPct(m.ach) >= 100).length, withT = D.inP.filter(m => Number.isFinite(m.ach)).length;
  card(0, 'REVENUE & ACHIEVEMENT', [{ t: frE(s.rev) }, { t: frP(ach.ach) }], [['Budget', frE(ach.target)], ['Gap to budget', `${gap < 0 ? '−' : ''}${frE(Math.abs(gap))}`, ach.target > 0 ? { t: `${gap >= 0 ? '+' : ''}${(gap / ach.target * 100).toFixed(1)}%`, good: gap >= 0 } : null], ['Per working day', frE(perWd(s.rev))], ['Months on target', `${onT} of ${withT}`, withT ? { t: frP(onT / withT), good: onT / withT >= 0.5 } : null]]);
  card(1, 'CUSTOMER-PAY REVENUE', [{ t: frE(s.payer[0]) }], [['Share of revenue', frP(s.payer[0] / s.rev)], ['Customer-pay ROs', frN(c.cashRos)], ['Per working day', frE(perWd(s.payer[0]))], ['Revenue per customer-pay RO', frEi(s.payer[0] / c.cashRos)]]);
  card(2, 'WARRANTY REVENUE', [{ t: frE(s.payer[1]) }], [['Share of revenue', frP(s.payer[1] / s.rev)], ['Warranty ROs', frN(c.warRos)], ['Per working day', frE(perWd(s.payer[1]))]]);
  card(3, 'REPAIR ORDERS & VEHICLES', [{ t: `${frN(s.ros)} ROs` }, { t: `${frN(s.vins)} cars` }], [['ROs per working day', Number.isFinite(perWd(s.ros)) ? perWd(s.ros).toFixed(1) : 'n/a'], ['Cars per working day', Number.isFinite(perWd(s.vins)) ? perWd(s.vins).toFixed(1) : 'n/a'], ['ROs per vehicle', s.vins ? (s.ros / s.vins).toFixed(2) : 'n/a'], ['Average ROs per month', frN(s.ros / Math.max(1, D.inP.length))]]);
  card(4, 'REVENUE PER RO & PER VEHICLE', [{ t: frEi(s.revPerRo) }, { t: frEi(s.revPerVin) }], [['Labour share of revenue', frP(s.labour / s.rev)], ['Parts share of revenue', frP(s.parts / s.rev)], ['Discount share of gross', frP(s.rate)]]);
  card(5, 'REVENUE PER RO: EM & BS', [{ t: `EM ${frN(c.em.revPerRo)}` }, { t: `BS ${frN(c.bs.revPerRo)}` }], [['EM revenue', frE(c.em.rev)], ['BS revenue', frE(c.bs.rev)], ['EM ROs', frN(c.em.ros)], ['BS ROs', frN(c.bs.ros)]]);
  /* 4 achievement & budget */
  frFrameB(R, 4, 'Achievement & budget', '', D);
  frKeyB(R, 9.6, 0.7, [{ color: K.yellow, t: `${P.tag} achievement` }, { type: 'line', t: '100% target' }]);
  const achCol = (x0, w0, rows, heading) => {
    R.text(heading, x0, 1.07, w0, 0.24, { size: 11, bold: true, color: K.black });
    const list = rows.slice(0, 16), maxA = Math.max(1.4, ...list.map(r => r.a || 0)) * 1.02;
    const g = frHBars(R, x0, 1.45, w0, 4.35, list.map(r => ({ name: r.name, sub: `EGP ${frM(r.rev)} revenue`, v: r.a || 0, lab: Number.isFinite(r.a) ? [{ t: frP(r.a), bold: true, color: frAchCol(r.a) }, { t: ` (${frM(r.rev)}/${frM(r.target)})` }] : [{ t: 'no budget', color: K.grey }] })), { max: maxA, nameW: 1.48, labW: 1.75, maxRh: 0.42, bh: 0.17 });
    if (g) { const lx = g.bx + g.bw / maxA; R.line(lx, 1.4, lx, 1.45 + list.length * g.rh, { color: '6B6E70', dash: true, w: 1 }); }
  };
  const uRows = units.filter(u => u.target > 0).sort((a, b) => b.rev - a.rev).map(u => ({ name: u.name, rev: u.rev, target: u.target, a: u.target > 0 ? u.rev / u.target : NaN }));
  const bRows = brs.filter(b => b.target > 0).map(b => ({ name: b.name, rev: b.rev, target: b.target, a: b.target > 0 ? b.rev / b.target : NaN }));
  achCol(0.26, 6.2, uRows, 'BY UNIT · EM AND BS SEPARATE · SORTED BY REVENUE');
  achCol(6.85, 6.2, bRows, 'BY BRANCH · EM AND BS COMBINED · SORTED BY REVENUE');
  const tU = uRows.filter(u => Number.isFinite(u.a)), belowU = tU.filter(u => C.roundPct(u.a) < 100), tB = bRows.filter(b => Number.isFinite(b.a));
  const hiB = tB.slice().sort((a, b) => b.a - a.a).slice(0, 3), loB = tB.slice().sort((a, b) => a.a - b.a).slice(0, 3);
  frInsightB(R, [['By unit', `${tU.length - belowU.length} of ${tU.length} units reached budget.${belowU.length ? ` Below: ${belowU.map(u => `${u.name} ${frP(u.a)}`).join(', ')}.` : ''}`], ['By branch', `Highest: ${hiB.map(b => `${b.name} ${frP(b.a)}`).join(', ')}. Lowest: ${loB.map(b => `${b.name} ${frP(b.a)}`).join(', ')}.`]]);
  frRemarkB(R, `Labels: achievement (revenue / budget) for ${P.short}. Green = at or above budget, red = below. Achievement is rounded to 0.1%.`);
  /* 5 monthly revenue & achievement */
  frFrameB(R, 5, 'Monthly revenue & achievement', `EGP millions per month; the black mark is the month's budget; achievement under each month${D.trend ? ' (the last 6 months)' : ''}`, D);
  frKeyB(R, 8.7, 0.7, [{ color: K.yellow, t: 'Revenue' }, { color: K.black, t: 'Budget' }, { color: '1E8E3E', t: 'At/above budget' }, { color: 'D0021B', t: 'Below' }]);
  frCols(R, 0.5, 4.95, 12.4, 3.4, D.months.map(m => ({ x: MON[m.ym % 100 - 1] + (D.months.some(z => Math.floor(z.ym / 100) !== Math.floor(m.ym / 100)) ? ' ' + String(Math.floor(m.ym / 100)).slice(2) : ''), v: m.rev, mark: m.target || 0, lab: m.has ? M2(m.rev) : 'no data', under: Number.isFinite(m.ach) ? frP(m.ach) : '', uc: frAchCol(m.ach), ub: true })), { bw: 0.78 });
  const best = D.inP.filter(m => Number.isFinite(m.ach)).sort((a, b) => b.ach - a.ach), byRev = D.inP.slice().sort((a, b) => b.rev - a.rev);
  frInsightB(R, [['Months', withT ? `${onT} of ${withT} months reached budget. Best: ${MON[best[0].ym % 100 - 1]} ${frP(best[0].ach)}; weakest: ${MON[best[best.length - 1].ym % 100 - 1]} ${frP(best[best.length - 1].ach)}.` : 'No monthly budgets loaded for the period.'], ['Revenue', byRev.length ? `Highest month ${MON[byRev[0].ym % 100 - 1]} ${frE(byRev[0].rev)}, lowest ${MON[byRev[byRev.length - 1].ym % 100 - 1]} ${frE(byRev[byRev.length - 1].rev)}; average ${frE(s.rev / byRev.length)} a month.` : '']], 5.95);
  /* 6 revenue by payer */
  frFrameB(R, 6, 'Revenue by payer', `EGP millions, ${P.short}`, D);
  const pay = [['Customer-pay', s.payer[0], K.yellow], ['Warranty', s.payer[1], K.blue], ['PDI', s.payer[2], K.mag]], pmax = Math.max(...pay.map(x => x[1]), 1);
  pay.forEach((x, k) => { const y = 1.75 + k * 1.1; R.text(x[0], 0.26, y, 1.5, 0.3, { size: 12, bold: true, align: 'right', valign: 'middle' }); const w = Math.max(0, x[1]) / pmax * 5.8; R.rect(1.86, y + 0.05, Math.max(0.03, w), 0.2, { fill: x[2] }); R.text(M2(x[1]), 1.86 + w + 0.06, y, 1.6, 0.3, { size: 12, valign: 'middle' }); });
  R.text('SHARE OF REVENUE', 8.95, 1.16, 4, 0.26, { size: 11, bold: true });
  pay.forEach((x, k) => { const y = 1.6 + k * 1.3; R.text(x[0].toUpperCase(), 8.95, y, 2.4, 0.22, { size: 9, bold: true, color: K.grey }); R.text(frP(x[1] / s.rev), 8.95, y + 0.25, 2.0, 0.5, { size: 26, bold: true, valign: 'middle' }); R.text(`${frE(perWd(x[1]))} per working day`, 11.0, y + 0.25, 2.2, 0.5, { size: 10, color: K.grey, valign: 'middle' }); });
  const shares = D.inP.filter(m => m.rev).map(m => m.cash / m.rev);
  frInsightB(R, [['Mix', `Customer-pay ${frP(s.payer[0] / s.rev)}, warranty ${frP(s.payer[1] / s.rev)}, PDI ${frP(s.payer[2] / s.rev)} of revenue.`], ['By month', shares.length > 1 ? `Customer-pay share ranged from ${frP(Math.min(...shares))} to ${frP(Math.max(...shares))}.` : `Customer-pay ROs ${frN(c.cashRos)}, warranty ROs ${frN(c.warRos)}.`]]);
  /* 7 revenue per RO */
  frFrameB(R, 7, 'Revenue per repair order', `EGP per RO, ${P.short}: mechanical (EM) and body shop (BS)`, D);
  const rpo = scope => units.filter(u => u.scope === scope && u.actRos).sort((a, b) => b.revPerRo - a.revPerRo);
  const emU = rpo('EM'), bsU = rpo('BS');
  R.text(`MECHANICAL (EM) · OVERALL EGP ${frN(c.em.revPerRo)}`, 0.26, 1.04, 7, 0.26, { size: 11, bold: true });
  R.text(`BODY SHOP (BS) · OVERALL EGP ${frN(c.bs.revPerRo)}`, 7.9, 1.04, 5, 0.26, { size: 11, bold: true });
  frHBars(R, 0.26, 1.4, 6.95, 4.4, emU.map(u => ({ name: u.name, sub: `${frN(u.actRos)} ROs`, v: u.revPerRo, lab: frN(u.revPerRo) })), { col: K.yellow, nameW: 1.5, labW: 0.8, maxRh: 0.4, bh: 0.2 });
  frHBars(R, 7.9, 1.4, 5.0, 4.4, bsU.map(u => ({ name: u.name, sub: `${frN(u.actRos)} ROs`, v: u.revPerRo, lab: frN(u.revPerRo) })), { col: K.blue, nameW: 1.5, labW: 0.8, maxRh: 0.55, bh: 0.2 });
  frInsightB(R, [['EM', emU.length ? `Highest ${emU[0].name} ${frEi(emU[0].revPerRo)}, lowest ${emU[emU.length - 1].name} ${frEi(emU[emU.length - 1].revPerRo)}.` : 'No EM repair orders.'], ['BS', bsU.length && c.em.revPerRo ? `Body shop revenue per RO is ${(c.bs.revPerRo / c.em.revPerRo).toFixed(1)}× mechanical; highest ${bsU[0].name} ${frEi(bsU[0].revPerRo)}.` : 'No BS repair orders.']]);
  /* 8 discounts */
  frFrameB(R, 8, 'Discounts', `${P.short}: mechanical (EM), body shop (BS) and combined`, D);
  const grp = [['Mechanical (EM)', c.em], ['Body shop (BS)', c.bs], ['Combined', c.comb]];
  const dcol = (x0, title, val, fmt, col, under) => { R.text(title, x0, 1.04, 4, 0.26, { size: 11, bold: true }); frCols(R, x0, 4.58, 3.9, 3.0, grp.map(g => ({ x: g[0], v: val(g[1]), lab: fmt(val(g[1])), under: under ? under(g[1]) : '' })), { col, bw: 0.76, lb: false, ls: 10, xb: false }); };
  dcol(0.5, 'DISCOUNT RATE', x => x.rate, frP, K.yellow);
  dcol(4.86, 'DISCOUNTED REPAIR ORDERS', x => x.discRos, frN, K.blue, x => `${frP(x.discRos / x.ros)} of ROs`);
  dcol(9.22, 'DISCOUNT VALUE · EGP', x => x.disc, M2, K.yellow);
  frInsightB(R, [['Total', `Combined discount rate ${frP(c.comb.rate)}; ${frN(c.comb.discRos)} discounted ROs (${frP(c.comb.discRos / c.comb.ros)} of ROs); value ${frE(c.comb.disc)}.`], ['By type', `Mechanical ${frP(c.em.rate)}, body shop ${frP(c.bs.rate)}.`]], 5.35);
  frRemarkB(R, 'Remark: discount rate = discount value ÷ gross revenue (net + discount). Discounted RO = repair order with at least one discounted line.');
  /* 9 monthly ROs & vehicles */
  frFrameB(R, 9, 'Monthly repair orders & vehicles', `Repair orders billed and distinct vehicles per month${D.trend ? ' (the last 6 months)' : ''}`, D);
  frKeyB(R, 10.2, 0.7, [{ color: K.blue, t: 'Repair orders' }, { color: 'D9D9D6', t: 'Vehicles' }]);
  { const n = D.months.length, x0 = 0.5, w0 = 12.4, base = 5.2, h0 = 3.6, slot = w0 / n, bw = Math.min(0.45, slot * 0.33), max = Math.max(...D.months.map(m => Math.max(m.ros, m.vins)), 1);
    R.line(x0, base, x0 + w0, base, { color: 'D0D0CE', w: 1 });
    D.months.forEach((m, k) => { const cx = x0 + slot * k + slot / 2, h1 = m.ros / max * h0, h2 = m.vins / max * h0;
      R.rect(cx - bw - 0.01, base - h1, bw, h1, { fill: K.blue }); R.rect(cx + 0.01, base - h2, bw, h2, { fill: 'D9D9D6' });
      R.text(frN(m.ros), cx - bw - 0.3, base - h1 - 0.26, bw + 0.6, 0.2, { size: 7.5, bold: true, align: 'center', wrap: false }); R.text(frN(m.vins), cx - 0.29, base - h2 - 0.26, bw + 0.6, 0.2, { size: 7.5, color: K.grey, align: 'center', wrap: false });
      R.text(MON[m.ym % 100 - 1], cx - slot / 2, base + 0.05, slot, 0.22, { size: 9, bold: true, align: 'center' }); }); }
  const bR = D.inP.slice().sort((a, b) => b.ros - a.ros);
  frInsightB(R, [['Repair orders', bR.length ? `${frN(s.ros)} in total, ${frN(s.ros / bR.length)} a month on average; busiest ${MON[bR[0].ym % 100 - 1]} (${frN(bR[0].ros)}), quietest ${MON[bR[bR.length - 1].ym % 100 - 1]} (${frN(bR[bR.length - 1].ros)}).` : ''], ['Vehicles', `${frN(s.vins)} distinct vehicles over the period; ${s.vins ? (s.ros / s.vins).toFixed(2) : 'n/a'} ROs per vehicle.`]]);
  /* 10 models */
  frFrameB(R, 10, 'Revenue and car entries by model', `${P.short}; car entries are repair orders (PDI excluded)`, D);
  const mods = [...c.models.values()];
  const mRev = mods.slice().sort((a, b) => b.rev - a.rev).slice(0, 12), mEnt = mods.slice().sort((a, b) => b.ent - a.ent).slice(0, 15);
  R.text('REVENUE BY MODEL · EGP MILLIONS', 0.26, 1.04, 6, 0.26, { size: 11, bold: true });
  R.text('CAR ENTRIES BY MODEL · REPAIR ORDERS', 6.87, 1.04, 6, 0.26, { size: 11, bold: true });
  frHBars(R, 0.26, 1.4, 6.2, 4.4, mRev.map(m => ({ name: m.name, v: m.rev, lab: M2(m.rev) })), { col: K.yellow, nameW: 1.38, labW: 0.8, maxRh: 0.36, bh: 0.2, ns: 7.5 });
  frHBars(R, 6.87, 1.4, 6.2, 4.4, mEnt.map(m => ({ name: m.name, v: m.ent, lab: frN(m.ent) })), { col: K.blue, nameW: 1.38, labW: 0.7, maxRh: 0.3, bh: 0.17, ns: 7.5 });
  frInsightB(R, [['Revenue', `Top models: ${mRev.slice(0, 3).map(m => `${m.name} ${frE(m.rev)} (${frP(m.rev / s.rev)})`).join(', ')}.`], ['Entries', `Most entries: ${mEnt.slice(0, 3).map(m => `${m.name} ${frN(m.ent)}`).join(', ')}.`]]);
  /* 11 advisors */
  frFrameB(R, 11, 'Service advisors across all branches', "Each advisor's work added up across all branches: repair orders left of the name, revenue right", D);
  frKeyB(R, 10.0, 0.7, [{ color: K.blue, t: 'ROs' }, { color: K.yellow, t: 'Revenue' }]);
  const fly = (x0, w0, title, a, top) => {
    R.text(title, x0, 1.1, w0, 0.26, { size: 11, bold: true });
    const rows = [...c.advs[a].values()].sort((x, y) => y.rev - x.rev).slice(0, top), n = rows.length; if (!n) return rows;
    const rh = Math.min(0.3, 4.2 / n), nameW = 1.4, side = (w0 - nameW) / 2, cx = x0 + side, sw = side - 0.5, bh = rh * 0.5;
    const maxRo = Math.max(...rows.map(o => o.ros), 1), maxRev = Math.max(...rows.map(o => o.rev), 1);
    R.text('Repair orders', x0, 1.38, side, 0.22, { size: 9, bold: true, color: K.grey, align: 'center' }); R.text('Revenue', cx + nameW, 1.38, side, 0.22, { size: 9, bold: true, color: K.grey, align: 'center' });
    rows.forEach((o, k) => {
      const y = 1.66 + k * rh; if (k % 2 === 0) R.rect(x0, y, w0, rh, { fill: 'F7F7F7' });
      const nm = o.name + (o.nbr > 1 ? ` (${o.nbr} br)` : '');
      R.text(nm, cx, y, nameW, rh, { size: fitSize(nm, nameW - 0.06, 8, true, 5.5), bold: true, align: 'center', valign: 'middle', wrap: false });
      const cr = o.ros / maxRo * sw, cv = o.rev / maxRev * sw, by = y + (rh - bh) / 2;
      R.rect(cx - 0.02 - cr, by, cr, bh, { fill: K.blue }); R.text(frN(o.ros), cx - 0.02 - cr - 0.55, y, 0.5, rh, { size: 7.5, align: 'right', valign: 'middle', wrap: false });
      R.rect(cx + nameW + 0.02, by, cv, bh, { fill: K.yellow }); R.text(frM(o.rev), cx + nameW + 0.05 + cv, y, 0.6, rh, { size: 7.5, valign: 'middle', wrap: false });
    });
    return rows;
  };
  const fe = fly(0.26, 6.3, 'MECHANICAL (EM)', 0, 16), fb = fly(6.87, 6.2, 'BODY SHOP (BS)', 1, 12);
  const topT = rows => rows.slice(0, 3).map(o => `${o.name} ${frE(o.rev)} (${frN(o.ros)} ROs)`).join(', ');
  frInsightB(R, [['Mechanical', fe.length ? `Top: ${topT(fe)}.` : 'No EM advisors.'], ['Body shop', fb.length ? `Top: ${topT(fb)}.` : 'No BS advisors.']]);
  /* 12 thank you */
  R.slide(FR_BG.end || frBackground(), 'end');
  R.text('THANK YOU', 3.3, 3.4, 4, 0.5, { size: 22, bold: true, color: K.white, valign: 'middle' });
}

/* ---------- export ---------- */
async function exportFastReport(kind) {
  const S = A.S; if (!S || !S.n) return;
  const rg = frRangeSel(), budget = A.fr.style !== 'compare';
  setBusy(`Building After-sales fast report (${kind === 'pptx' ? 'PowerPoint' : 'PDF'})`);
  try {
    A._frLogo = await logos();
    const D = budget ? frBudgetData(rg.cs, rg.ce) : frData(rg);
    const name = (budget ? `After-Sales Review - ${D.P.tag}` : `After-sales fast report ${D.curL} vs ${D.prevL}`).replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (kind === 'pptx') {
      await loadScript(LIB.pptx);
      const P = new window.PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.title = name; P.company = 'Egyptian International Motors';
      P.theme = budget ? { headFontFace: 'Inter', bodyFontFace: 'Inter' } : { headFontFace: 'NouvelR', bodyFontFace: 'NouvelR' };
      if (budget) frSlidesBudget(frPptx(P, 'Inter'), D); else frSlides(frPptx(P), D);
      const blob = await P.write({ outputType: 'blob' }); setBusy(null); await saveFile(name + '.pptx', blob);
    } else {
      await loadScript(LIB.jspdf);
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'in', format: [FR.W, FR.H] });
      if (!window.INTER_TTF && LIB.inter) { try { await loadScript(LIB.inter); } catch (e) {} }
      try { if (window.INTER_TTF) { for (const [st, b64] of Object.entries(window.INTER_TTF)) { doc.addFileToVFS(`Inter-${st}.ttf`, b64); doc.addFont(`Inter-${st}.ttf`, 'Inter', st); } doc.__inter = true; } } catch (e) { doc.__inter = false; }
      if (budget) frSlidesBudget(frPdf(doc), D); else frSlides(frPdf(doc), D);
      const blob = doc.output('blob'); setBusy(null); await saveFile(name + '.pdf', blob);
    }
    audit('Fast report exported', `${kind.toUpperCase()} · ${budget ? D.P.long + ' (budget review)' : D.curL + ' vs ' + D.prevL}`);
  } catch (e) { setBusy(null); console.error(e); toast('Fast report failed: ' + (e.message || e), true); }
}
/* the fast report period: month, quarter, half year, year or year to date, ending at the chosen month */
function frRangeSel() {
  const S = A.S, end = Number(A.fr.cur) || C.ymOf(S.maxDay), ytd = A.fr.n === 'ytd';
  const n = ytd ? end % 100 : Number(A.fr.n) || 1, rg = frRange(end, n);
  if (n === 1 && A.fr.prev && A.fr.style === 'compare') { rg.ps = rg.pe = Number(A.fr.prev); }
  return Object.assign(rg, { n, ytd });
}
function fastReportSection() {
  const S = A.S; if (!S || !S.n) return '';
  const months = monthOptions().slice().reverse(), budget = A.fr.style !== 'compare';
  const rg = frRangeSel(), n = rg.n, end = rg.ce;
  const opt = (sel) => months.map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${ymLbl(m)}</option>`).join('');
  const miss = []; for (const [a0, b0] of budget ? [[rg.cs, rg.ce]] : [[rg.cs, rg.ce], [rg.ps, rg.pe]]) for (let m = a0; m <= b0; m = C.ymAdd(m, 1)) { if (!A.coverage.has(m)) miss.push(`transactions ${ymLbl(m)}`); if (!A.T.byMonth.get(m)) miss.push(`target ${ymLbl(m)}`); }
  const P = frPeriodText(rg.cs, rg.ce);
  const slides = budget ? ['Cover', 'Agenda', 'Headline figures', 'Achievement & budget', 'Monthly revenue & achievement', 'Revenue by payer', 'Revenue per repair order', 'Discounts', 'Monthly repair orders & vehicles', 'Revenue & entries by model', 'Service advisors', 'Thank you'] : ['Cover', 'Agenda', 'Headline figures', 'Achievement & budget', 'Revenue by payer', 'Revenue per repair order', 'Revenue change per day', 'Discounts', 'Billing trends by the week', 'Revenue & entries by model', 'Service advisors', 'Thank you'];
  const cur = A.fr.n === 'ytd' ? 'ytd' : n;
  return `<div class="section"><div class="sec-head"><div><h2>After-sales fast report</h2><p>${budget ? 'The standard 12-slide After-Sales Review: the chosen period against budget, in the Renault template (photo cover and closing, Inter font, yellow and blue charts, an insight box on every slide).' : 'The 12-slide comparison report: the current period against the previous period of the same length, like for like (totals, per working day and per calendar day).'} The PowerPoint and the PDF come from the same layout and data. One-off warranty is included unless “Exclude one-off warranty” is ticked in the filter bar.</p></div></div>
  <div class="choices"><span class="mini" style="align-self:center">Report:</span>${[['budget', 'Performance against budget'], ['compare', 'Against the previous period']].map(x => `<button class="choice ${(budget ? 'budget' : 'compare') === x[0] ? 'on' : ''}" data-act="frstyle" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <div class="choices">${[[1, 'Month'], [3, 'Quarter (3 months)'], [6, 'Half year (6 months)'], [12, 'Year (12 months)'], ['ytd', 'Year to date']].map(x => `<button class="choice ${cur === x[0] ? 'on' : ''}" data-act="frn" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
  <div class="toolbar" style="margin:6px 0 10px;align-items:flex-end"><div class="field"><label for="fr-cur">${n === 1 && !rg.ytd ? 'Month' : 'Period ending'}</label><select id="fr-cur" data-fr="cur">${opt(end)}</select></div>${n === 1 && !budget ? `<div class="field"><label for="fr-prev">Compared with</label><select id="fr-prev" data-fr="prev">${opt(rg.pe)}</select></div>` : ''}<div class="field wide"><label>Report</label><div style="padding:10px 0;font-weight:700">${budget ? esc(P.long) + ' · against budget' : `${esc(frLabel(rg.cs, rg.ce))} vs ${esc(frLabel(rg.ps, rg.pe))}`}</div></div><button class="btn yellow" data-act="frpptx">PowerPoint</button><button class="btn" data-act="frpdf">PDF</button></div>
  ${miss.length ? `<div class="notice">Missing: ${miss.join('; ')}. The report is still built, with n/a where data is missing.</div>` : ''}
  <ol class="outlist">${slides.map(t => `<li>${t}</li>`).join('')}</ol></div>`;
}

/* ======================= additions: status groups, revenue lines, daily billing, operating indicators ======================= */
function prevRange() { const len = (Math.floor(A.f.e / 100) * 12 + A.f.e % 100) - (Math.floor(A.f.s / 100) * 12 + A.f.s % 100) + 1; return { s: C.ymAdd(A.f.s, -len), e: C.ymAdd(A.f.e, -len), len }; }
function statusGroupsSection() {
  const S = A.S, pr = prevRange();
  const cur = C.achievement(S, A.T, F()), prv = C.achievement(S, A.T, F({ s: pr.s, e: pr.e }));
  const pm = new Map(prv.rows.map(r => [r.unit, r]));
  const rows = cur.rows.filter(r => r.target > 0).map(r => { const p = pm.get(r.unit); const ca = r.rev / r.target, pa = p && p.target > 0 ? p.rev / p.target : NaN; const con = C.roundPct(ca) >= 100, pon = Number.isFinite(pa) && C.roundPct(pa) >= 100; const grp = !Number.isFinite(pa) ? 'No previous target' : con && pon ? 'On target both periods' : con ? 'Recovered to target' : pon ? 'Slipped below target' : 'Below target both periods'; return { unit: r.unit, ca, pa, d: ca - pa, grp, rev: r.rev }; }).sort((a, b) => b.rev - a.rev);
  const groups = ['On target both periods', 'Recovered to target', 'Slipped below target', 'Below target both periods', 'No previous target'];
  const gcls = { 'On target both periods': 'on', 'Recovered to target': 'blue', 'Slipped below target': 'near', 'Below target both periods': 'below', 'No previous target': '' };
  const lbl = `${ymLbl(pr.s)}${pr.len > 1 ? '–' + ymLbl(pr.e) : ''}`;
  const chips = `<div class="kv">${groups.filter(g => rows.some(r => r.grp === g)).map(g => `<div><span>${g}</span><b>${rows.filter(r => r.grp === g).length}</b><div class="mini">${rows.filter(r => r.grp === g).map(r => esc(r.unit)).join(', ')}</div></div>`).join('')}</div>`;
  return sec('Achievement change and target status', `Each unit's achievement against the previous period of the same length (${lbl}); change in percentage points. Status uses achievement rounded to 0.1%.`, chips + table(['Unit', `Achievement ${esc(lbl)}`, 'Achievement now', 'Change', 'Status'], rows.map(r => [esc(r.unit), achText(r.pa), achText(r.ca), ppChip(r.d), `<span class="tag ${gcls[r.grp]}">${r.grp}</span>`])));
}
function revenueLinesSection() {
  const S = A.S, f = F();
  const comps = [['Labour', 'L'], ['Parts', 'P'], ['Other', 'O']].map(([n, k]) => { const a = C.achievement(S, A.T, f, k); return { name: n, rev: a.revenue, target: a.target, src: 'Transactions' }; });
  const ext = { counter: { b: 0, a: 0, p: 0, n: 0 }, dealer: { b: 0, a: 0, p: 0, n: 0 }, wholesale: { b: 0, a: 0, p: 0, n: 0 }, external: { b: 0, a: 0, p: 0, n: 0 }, totalSales: { b: 0, a: 0, p: 0, n: 0 } };
  const scale = Number(A.cfg.targetScale) || 1; let months = 0;
  for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) { const d = A.imports.find(x => x.kind === 'target' && x.period === C.ymStr(m)); if (!d || !d.ext) continue; months++; const tf = C.targetFactor(A.cfg, m); for (const k of Object.keys(ext)) { const v = d.ext[k]; if (!v) continue; ext[k].b += (v.budget || 0) * scale * tf; ext[k].a += (v.actual || 0) * scale; ext[k].p += (v.prior || 0) * scale; ext[k].n++; } }
  const extRows = [['Counter sales', 'counter'], ['Dealer sales', 'dealer'], ['Wholesale / free zone', 'wholesale'], ['External parts sales (sub-total)', 'external'], ['Total Renault sales (DSR)', 'totalSales']].filter(x => ext[x[1]].n && (ext[x[1]].b || ext[x[1]].a));
  const all = comps.map(c => ({ name: c.name, rev: c.rev, target: c.target, prior: NaN, src: 'Transactions' })).concat(extRows.map(([n, k]) => ({ name: n, rev: ext[k].a, target: ext[k].b, prior: ext[k].p, src: 'DSR report' })));
  const body = hbars(all.map(x => ({ label: x.name, segs: [{ v: Math.max(0, x.rev), color: x.target > 0 ? statusColor(x.rev / x.target) : 'var(--blue)' }], marker: x.target > 0 ? x.target : 0, value: `<b>${egpC(x.rev)}</b>`, sub: achLine(x.rev, x.target) + `<br><span class="mini">${x.src}${Number.isFinite(x.prior) && x.prior ? ` · last year ${egpC(x.prior)}` : ''}</span>` })), { aria: 'Revenue lines against budget' });
  const note = months ? (extRows.length ? '' : '<div class="notice">The saved target reports have no external parts lines yet. Re-import them to read counter and dealer sales.</div>') : '<div class="notice">No target report for this period.</div>';
  return sec('Revenue lines against budget', 'Labour, parts and other revenue from the transactions against their budgets; external parts sales (counter, dealer) as reported in the Daily Sales Report, with last year from the same report.', note + body + table(['Line', 'Revenue', 'Budget', 'Achievement', 'Last year', 'Source'], all.map(x => [esc(x.name), egp(x.rev), x.target > 0 ? egp(x.target) : '—', x.target > 0 ? achBar(x.rev / x.target) : '—', Number.isFinite(x.prior) && x.prior ? egp(x.prior) : '—', x.src])));
}
function dailyBillingSection() {
  const S = A.S, cur = A.f.e, prev = C.ymAdd(cur, -1);
  const f = F({ s: prev, e: cur }), idx = C.select(S, f);
  const by = { [cur]: new Array(32).fill(0), [prev]: new Array(32).fill(0) }, has = { [cur]: new Set(), [prev]: new Set() };
  for (const i of idx) { const ym = S.ym[i]; if (!by[ym]) continue; const d = S.day[i] % 100; by[ym][d] += S.net[i]; has[ym].add(d); }
  const days = Array.from({ length: 31 }, (_, k) => k + 1);
  const val = (ym, d) => (d > C.daysInMonth(ym) ? null : (has[ym].has(d) || (ym !== C.ymOf(S.maxDay) || d <= S.maxDay % 100) ? by[ym][d] : null));
  const rows = days.map(d => [String(d), val(prev, d) == null ? '—' : egp(val(prev, d)), val(cur, d) == null ? '—' : egp(val(cur, d))]);
  rows.push({ _cls: 'total', cells: ['Total', egp(by[prev].reduce((a, b) => a + b, 0)), egp(by[cur].reduce((a, b) => a + b, 0))] });
  return sec(`Daily billing — ${ymLbl(cur)} vs ${ymLbl(prev)}`, 'Revenue for every calendar day of both months, by billing date. Days with no billing show zero (Fridays and holidays).', lineChart({ labels: days.map(String), series: [{ name: ymLbl(prev), color: 'var(--grey)', values: days.map(d => val(prev, d)) }, { name: ymLbl(cur), color: 'var(--blue)', values: days.map(d => val(cur, d)) }], fmt: 'money', aria: 'Daily billing' }) + `<details class="box"><summary>Exact values</summary>${table(['Day', ymLbl(prev), ymLbl(cur)], rows, { maxH: 420 })}</details>`);
}
function operatingSection(part) {
  const S = A.S, cur = stats(A.f.s, A.f.e), pr = prevRange(), prv = stats(pr.s, pr.e), ly = stats(A.f.s - 100, A.f.e - 100);
  const ops = (st) => {
    const ro = new Map(), vinRo = new Map();
    for (const i of st.idx) { if (S.act[i] === 2) continue; const r = S.ro[i]; let o = ro.get(r); if (!o) { o = { cr: 0, bill: 0, br: S.br[i] }; ro.set(r, o); } if (S.created[i] && (!o.cr || S.created[i] < o.cr)) o.cr = S.created[i]; if (S.day[i] > o.bill) o.bill = S.day[i]; if (S.vin[i] >= 0) { let s2 = vinRo.get(S.vin[i]); if (!s2) { s2 = new Set(); vinRo.set(S.vin[i], s2); } s2.add(r); } }
    let n = 0, tot = 0, same = 0, over7 = 0; const brOpen = new Map();
    for (const o of ro.values()) { if (!o.cr) continue; const d = Math.max(0, C.dayDiff(o.cr, o.bill)); n++; tot += d; if (d === 0) same++; if (d > 7) over7++; const b = brOpen.get(o.br) || { n: 0, t: 0, d0: 0, d1: 0, d27: 0, d8: 0, max: 0, ds: [] }; b.n++; b.t += d; if (d === 0) b.d0++; else if (d === 1) b.d1++; else if (d <= 7) b.d27++; else b.d8++; if (d > b.max) b.max = d; b.ds.push(d); brOpen.set(o.br, b); }
    const multi = [...vinRo.values()].filter(s2 => s2.size >= 2).length;
    return { avgOpen: n ? tot / n : NaN, sameDay: n ? same / n : NaN, over7: n ? over7 / n : NaN, multi, multiShare: vinRo.size ? multi / vinRo.size : NaN, brOpen, ro: n };
  };
  // the RO pass is shared by the two parts of this section (days-open table and operating indicators)
  const ck = JSON.stringify([cur.f.s, cur.f.e, pr.s, pr.e, cur.f.branches ? [...cur.f.branches] : null, cur.f.act, cur.f.cw, cur.f.noOW, S.n]);
  if (!A._opsC || A._opsC.key !== ck || A._opsC.S !== S) A._opsC = { key: ck, S, oc: ops(cur), op: ops(prv) };
  const oc = A._opsC.oc, op = A._opsC.op, sm = cur.sm, ps = prv.sm;
  const lyTxt = ly.sm.lines ? `${egpC(ly.sm.rev)} ${trendMark(sm.rev, ly.sm.rev)}` : 'Not loaded';
  let h = '';
  if (part === 'days') {
  // days open: share of ROs billed the same day they were opened, for each branch against the network and the period before
  const med = a => { if (!a.length) return NaN; const x = a.slice().sort((p, q) => p - q), k = x.length >> 1; return x.length % 2 ? x[k] : (x[k - 1] + x[k]) / 2; };
  const net = { n: 0, t: 0, d0: 0, d1: 0, d27: 0, d8: 0, max: 0, ds: [] }; for (const b of oc.brOpen.values()) { for (const k of ['n', 't', 'd0', 'd1', 'd27', 'd8']) net[k] += b[k]; net.max = Math.max(net.max, b.max); net.ds = net.ds.concat(b.ds); }
  let pn = 0, p0 = 0; for (const b of op.brOpen.values()) { pn += b.n; p0 += b.d0; }
  const netSame = net.n ? net.d0 / net.n : NaN, pNet = pn ? p0 / pn : NaN;
  const pp = v => (Number.isFinite(v) ? `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)} pp` : '—');
  const ppTag = (v, good) => (Number.isFinite(v) ? `<span class="ach ${(good ? v >= 0 : v <= 0) ? 'on' : 'below'}">${pp(v)}</span>` : '—');
  const bar = v => (Number.isFinite(v) ? `<div style="display:flex;gap:8px;align-items:center;justify-content:flex-end"><span>${pct(v)}</span><span style="display:inline-block;width:70px;height:8px;background:var(--line);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.min(100, v * 100)}%;background:var(--c4)"></i></span></div>` : '—');
  const brRows = [...oc.brOpen].map(([bi, b]) => { const p = op.brOpen.get(bi); return { bi, name: S.branches[bi], b, same: b.n ? b.d0 / b.n : NaN, pSame: p && p.n ? p.d0 / p.n : NaN, avg: b.n ? b.t / b.n : NaN, pAvg: p && p.n ? p.t / p.n : NaN, few: b.n < 30 }; }).sort((a, b) => (a.few - b.few) || b.same - a.same || a.avg - b.avg);
  const openAvg = b => (b.n - b.d0 ? b.t / (b.n - b.d0) : NaN);
  const dRows = brRows.map((r, k) => [r.few ? '—' : String(k + 1), esc(r.name) + (r.few ? ' <span class="mini">(too few ROs to rank)</span>' : ''), fmtInt(r.b.n), fmtInt(r.b.d0), bar(r.same), ppTag(r.same - netSame, true), pct(r.b.d1 / r.b.n), pct(r.b.d27 / r.b.n), pct(r.b.d8 / r.b.n), r.avg.toFixed(2), Number.isFinite(openAvg(r.b)) ? openAvg(r.b).toFixed(1) : '—', fmtInt(r.b.max), Number.isFinite(r.pSame) ? pct(r.pSame) : '—', ppTag(r.same - r.pSame, true), Number.isFinite(r.pAvg) ? `${r.pAvg.toFixed(2)} ${trendMark(r.avg, r.pAvg, true)}` : '—']);
  if (net.n) dRows.push({ _cls: 'total', cells: ['', 'Network', fmtInt(net.n), fmtInt(net.d0), bar(netSame), '—', pct(net.d1 / net.n), pct(net.d27 / net.n), pct(net.d8 / net.n), (net.t / net.n).toFixed(2), Number.isFinite(openAvg(net)) ? openAvg(net).toFixed(1) : '—', fmtInt(net.max), Number.isFinite(pNet) ? pct(pNet) : '—', ppTag(netSame - pNet, true), Number.isFinite(op.avgOpen) ? `${op.avgOpen.toFixed(2)} ${trendMark(net.t / net.n, op.avgOpen, true)}` : '—'] });
  const ranked = brRows.filter(r => !r.few), best = ranked[0], worst = ranked[ranked.length - 1];
  const note = ranked.length > 1 ? `<p class="mini" style="margin:8px 0 0">${esc(best.name)} closes the most repair orders the same day (${pct(best.same)}); ${esc(worst.name)} the fewest (${pct(worst.same)}). Network: ${pct(netSame)}${Number.isFinite(pNet) ? `, ${pp(netSame - pNet)} against the period before` : ''}.</p>` : '';
  h += sec('Days open by branch — same-day closing', `Repair orders from opening (Created On) to billing, PDI excluded; ${periodText(A.f)} against the period before (${periodText(pr)}). Ranked by the share billed the same day. “vs network” = branch minus network, in percentage points.`, brRows.length ? table(['#', 'Branch', 'ROs', 'Same day', 'Same-day %', 'vs network', 'Next day', '2–7 days', 'Over 7 days', 'Avg days', 'Avg days when not same day', 'Longest (days)', 'Same-day % before', 'Change', 'Avg days before'], dRows, { align: ['num', '', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num', 'num'] }) + note : '<div class="empty"><strong>No opening dates</strong>Created On dates are needed. Re-import the transaction files.</div>');
    return h;
  }
  h = cards([
    { label: 'Days open (RO opening to billing)', value: Number.isFinite(oc.avgOpen) ? oc.avgOpen.toFixed(2) + ' days' : 'N/A', note: `${pct(oc.sameDay)} billed the same day · ${pct(oc.over7)} over 7 days · before ${Number.isFinite(op.avgOpen) ? op.avgOpen.toFixed(2) : 'n/a'}` },
    { label: 'Appointment share', value: pct(sm.apptRate), note: `${fmtInt(sm.apptRos)} appointment ROs · before ${pct(ps.apptRate)}`, t: 't-blue' },
    { label: 'Vehicles with 2+ ROs', value: fmtInt(oc.multi), count: true, note: `${pct(oc.multiShare)} of vehicles in the period · before ${fmtInt(op.multi)}`, t: 't-mag' },
    { label: 'Parts EGP per labour EGP', value: sm.labour ? (sm.parts / sm.labour).toFixed(2) : 'N/A', note: `Before ${ps.labour ? (ps.parts / ps.labour).toFixed(2) : 'n/a'}`, t: 't-dark' },
    { label: 'Labour per working day', value: egpC(sm.labour / cur.days.wd), note: `Before ${egpC(ps.labour / prv.days.wd)} ${trendMark(sm.labour / cur.days.wd, ps.labour / prv.days.wd)}` },
    { label: 'Revenue vs same period last year', value: egpC(sm.rev), note: `Last year: ${lyTxt}`, t: 't-blue' },
  ], 'Operating indicators');
  return h;
}

/* ======================= page: parts (categories · cash and warranty) ======================= */
const catName = (S, i) => (S.partCats[i] ? S.partCats[i].name : '—');
const catColor = (S, i) => (S.partCats[i] ? S.partCats[i].color : 'var(--grey)');
function partsEx() { if (!A.partsEx) A.partsEx = new Set(A.partsNoSvc ? ['service'] : []); return A.partsEx; }
/* ---- part numbers by branch (Parts tab) ---- */
function partsSort() { if (!A.partsSort) { try { A.partsSort = localStorage.getItem('ps.partsSort') || 'rev'; } catch (e) { A.partsSort = 'rev'; } } return A.partsSort === 'qty' ? 'qty' : 'rev'; }
/* one pass over the selected parts lines: per part number and branch, revenue and quantity, split cash / warranty */
function partsBrData() {
  const S = A.S, P = S.P; if (!P || !P.n) return null;
  const f = Object.assign(F(), { exCats: [...partsEx()] }), key = JSON.stringify([f.s, f.e, f.branches ? [...f.branches] : null, f.act, f.cw, f.noOW, f.exCats, P.n]);
  if (A._pbr && A._pbr.key === key && A._pbr.S === S) return A._pbr.res;
  const ix = C.selectParts(S, f), m = new Map(), brs = new Set();
  for (const i of ix) { const k = P.mat[i], b = P.br[i], w = P.cw[i]; let o = m.get(k); if (!o) { o = { m: k, net: 0, qty: 0, cat: P.cat[i], br: new Map() }; m.set(k, o); } o.net += P.net[i]; o.qty += P.qty[i];
    let y = o.br.get(b); if (!y) { y = [0, 0, 0, 0, 0, 0]; o.br.set(b, y); } y[0] += P.net[i]; y[1] += P.qty[i]; if (w === 0) { y[2] += P.net[i]; y[3] += P.qty[i]; } else if (w === 1) { y[4] += P.net[i]; y[5] += P.qty[i]; } brs.add(b); }
  const list = [...m.values()].filter(o => o.net || o.qty);
  const brList = [...brs].sort((a, b) => { const ia = BRANCH_ORDER.indexOf(S.branches[a]), ib = BRANCH_ORDER.indexOf(S.branches[b]); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  const res = { list, brList }; A._pbr = { key, S, res }; return res;
}
const pNm = code => `<span style="white-space:nowrap">${esc(code)}</span>${partName(code) ? ` <span class="mini">${esc(partName(code))}</span>` : ''}`;
function partsBrTable(limit) {
  const S = A.S, d = partsBrData(); if (!d) return null; const q = partsSort() === 'qty';
  const l = d.list.slice().sort((a, b) => (q ? b.qty - a.qty || b.net - a.net : b.net - a.net || b.qty - a.qty)), top = limit ? l.slice(0, limit) : l;
  const cell = y => (!y ? '—' : `${egpC(y[0])}<br><span class="mini">${fmtInt(y[1])} units</span>`);
  const tot = new Map(); for (const o of l) for (const [b, y] of o.br) { const t = tot.get(b) || [0, 0]; t[0] += y[0]; t[1] += y[1]; tot.set(b, t); }
  const rows = [Object.assign([`<b>All ${fmtInt(l.length)} part numbers</b>`].concat(d.brList.map(b => `<b>${cell(tot.get(b))}</b>`), [`<b>${egpC(l.reduce((a, o) => a + o.net, 0))}</b>`, `<b>${fmtInt(l.reduce((a, o) => a + o.qty, 0))}</b>`]), { _cls: 'total' })]
    .concat(top.map((o, k) => [`<span style="white-space:nowrap">${k + 1}.</span> ${pNm(S.mats[o.m])}`].concat(d.brList.map(b => cell(o.br.get(b))), [`<b>${egpC(o.net)}</b>`, `<b>${fmtInt(o.qty)}</b>`])));
  return { head: ['Part number'].concat(d.brList.map(b => esc(S.branches[b])), ['Total revenue', 'Total units']), rows, opts: { align: [''].concat(d.brList.map(() => 'num'), ['num', 'num']), maxH: 620 }, total: l.length };
}
/* top 15 RN- part numbers of each branch, cash beside warranty */
function partsBrExport() {
  const S = A.S, d = partsBrData(); if (!d) return { head: [], rows: [] }; const q = partsSort() === 'qty';
  const l = d.list.slice().sort((a, b) => (q ? b.qty - a.qty || b.net - a.net : b.net - a.net || b.qty - a.qty));
  const head = ['Part number', 'Name'].concat(...d.brList.map(b => [S.branches[b] + ' revenue', S.branches[b] + ' units']), ['Total revenue', 'Total units']);
  const rows = l.map(o => [S.mats[o.m], partName(S.mats[o.m])].concat(...d.brList.map(b => { const y = o.br.get(b); return y ? [Math.round(y[0]), Math.round(y[1] * 100) / 100] : ['', '']; }), [Math.round(o.net), Math.round(o.qty * 100) / 100]));
  return { head, rows };
}
function partsRnExport() {
  const t = partsRnTopTable(); const S = A.S; let br = '';
  return { head: t.head, rows: t.rows.map(r => { const a = r.map(txt); if (a[0]) br = a[0]; else a[0] = br; return a; }) };
}
function partsRnTopTable(limitBranches) {
  const S = A.S, d = partsBrData(); if (!d) return null; const q = partsSort() === 'qty';
  const rn = d.list.filter(o => isRN(S.mats[o.m])), rows = [];
  const brs = limitBranches ? d.brList.slice(0, limitBranches) : d.brList;
  for (const b of brs) {
    const pick = (vi, qi) => rn.map(o => { const y = o.br.get(b); return y && (y[vi] || y[qi]) ? { o, net: y[vi], qty: y[qi] } : null; }).filter(Boolean).sort((a, c) => (q ? c.qty - a.qty || c.net - a.net : c.net - a.net || c.qty - a.qty)).slice(0, 15);
    const cash = pick(2, 3), war = pick(4, 5), n = Math.max(cash.length, war.length); if (!n) continue;
    for (let k = 0; k < n; k++) { const c = cash[k], w = war[k];
      const r = [k ? '' : `<b>${esc(S.branches[b])}</b>`, String(k + 1), c ? pNm(S.mats[c.o.m]) : '', c ? egpC(c.net) : '', c ? fmtInt(c.qty) : '', w ? pNm(S.mats[w.o.m]) : '', w ? egpC(w.net) : '', w ? fmtInt(w.qty) : ''];
      if (!k) r._cls = 'grp'; rows.push(r); }
  }
  return { head: ['Branch', '#', 'Cash — RN- part number', 'Cash revenue', 'Cash units', 'Warranty — RN- part number', 'Warranty revenue', 'Warranty units'], rows, opts: { align: ['', 'num', '', 'num', 'num', '', 'num', 'num'], maxH: 680 } };
}
function partsBranchSections() {
  const d = partsBrData(); if (!d) return '';
  const q = partsSort() === 'qty', sortBtns = `<div class="seg" role="group" aria-label="Sort part numbers by">${[['rev', 'By revenue'], ['qty', 'By quantity']].map(([v, l]) => `<button class="btn small ${partsSort() === v ? '' : 'secondary'}" data-act="partssort" data-v="${v}">${l}</button>`).join(' ')}</div>`;
  const t1 = partsBrTable(1);
  const tb1 = lazyTable(t1.head, n => partsBrTable(n).rows, t1.opts, `Show the table — all ${fmtInt(t1.total)} part numbers by branch`, 'pbr|0|0|all', t1.total + 1, 51, partsBrExport);
  let h = sec(`Part numbers by branch — ${q ? 'by quantity' : 'by revenue'}`, `Every part number (with the categories left out above removed), sorted from the highest ${q ? 'quantity' : 'revenue'}. Each branch cell shows revenue and units; the first row is the branch total.`, tb1, sortBtns);
  const t2 = partsRnTopTable(1);
  const tb2 = lazyTable(t2.head, n => partsRnTopTable(n ? Math.ceil(n / 15) : 0).rows, t2.opts, `Show the table — top 15 per branch, ${fmtInt(d.brList.length)} branches`, 'pbr|0|0|rn', 15 * d.brList.length, 60, partsRnExport);
  h += sec(`Top 15 RN- part numbers in each branch — cash and warranty, ${q ? 'by quantity' : 'by revenue'}`, 'For every branch, the 15 RN- part numbers with the highest cash and warranty ' + (q ? 'quantity' : 'revenue') + ', side by side.', tb2, sortBtns);
  return h;
}
/* the part-number table (9.23), also shown on the Focus tab */
function partNumbersSec(mats) {
  const S = A.S, P = S.P, cats = S.partCats;
  // full part table with classification
  const admin = isAdmin(), ov = A.cfg.partOverride || {};
  const catSel = x => (admin ? `<select class="cell" data-act="partcat" data-code="${esc(x.code)}"><option value="">Rule: ${esc(catName(S, x.cat))}</option>${cats.map(c => `<option value="${esc(c.id)}" ${ov[x.code] === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>` : `<span class="tag">${esc(catName(S, x.cat))}</span>`);
  const psel = partSel(), pq = C.normOp(A.partQ || ''), found0 = pq ? mats.filter(x => C.normOp(x.code + ' ' + partName(x.code)).includes(pq)) : mats;
  const found = A.partSelOnly && psel.size ? found0.filter(x => psel.has(x.code)) : found0; A._partFound0 = found0.map(x => x.code);
  const shown = found.slice(0, 200); A._partShown = found.map(x => x.code);
  const pnInput = x => (admin ? `<input class="cell" dir="auto" style="width:190px;text-align:start" data-pname="${esc(x.code)}" value="${esc(partName(x.code))}" placeholder="add a name">` : esc(partName(x.code)));
  const ptools = `<div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field wide"><label for="part-q">Find part number or name</label><input id="part-q" class="inp" dir="auto" data-partq="1" value="${esc(A.partQ || '')}" placeholder="e.g. RN-1520, LOR-, filter"></div>${admin ? `<div class="field"><label for="part-bulk">Set category for the ${fmtInt(found.length)} found</label><select id="part-bulk" class="inp"><option value="">Choose…</option>${cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}<option value="__rule">Back to the rules</option></select></div><button class="btn secondary" data-act="partbulk">Apply</button>` : ''}${A.caps.downloads ? `<button class="btn small secondary" data-act="partsxlsx" title="Every part number with its name, category and figures for the period — edit the Name column and upload it back to name parts in bulk">${A.partSelOnly && psel.size ? `Excel — ${fmtInt(found.length)} selected part numbers` : `Excel — all ${fmtInt(mats.length)} part numbers`}</button><button class="btn small secondary" data-act="partscsv">CSV</button>` : ''}${admin ? `<button class="btn small secondary" data-act="pnupload" title="An Excel or CSV file with a part-number column and a name column (for example the file from “Excel — all part numbers”). The app already has ${fmtInt(SP_COUNT)} names built in; uploaded names take priority.">Upload part names (Excel)</button><input type="file" id="pn-file" accept=".xlsx,.xls,.xlsm,.csv" hidden>` : ''}</div>`;
  // the same part numbers one and two years earlier (same months): revenue with units, cash and warranty, each with its change against the year before
  // the selected period, then the two calendar years before it in full (Jan–Dec)
  const yY = Math.floor(A.f.e / 100), yRange = k => (k ? { s: (yY - k) * 100 + 1, e: (yY - k) * 100 + 12 } : { s: A.f.s, e: A.f.e });
  const yr = k => { const f = Object.assign({}, F(yRange(k))), mm = new Map(); for (const i of C.selectParts(S, f)) { let o = mm.get(P.mat[i]); if (!o) { o = { n: 0, q: 0, cn: 0, cq: 0, wn: 0, wq: 0, br: k === 2 ? null : new Map(), mo: k ? null : new Map() }; mm.set(P.mat[i], o); } if (o.mo) o.mo.set(P.model[i], (o.mo.get(P.model[i]) || 0) + P.qty[i]); o.n += P.net[i]; o.q += P.qty[i]; if (P.cw[i] === 0) { o.cn += P.net[i]; o.cq += P.qty[i]; } else if (P.cw[i] === 1) { o.wn += P.net[i]; o.wq += P.qty[i]; } if (o.br) { let b = o.br.get(P.br[i]); if (!b) { b = { n: 0, q: 0 }; o.br.set(P.br[i], b); } b.n += P.net[i]; b.q += P.qty[i]; } } return mm; };
  const Y0 = yr(0), Y1 = yr(1), Y2 = yr(2), z = { n: 0, q: 0, cn: 0, cq: 0, wn: 0, wq: 0 }, has1 = Y1.size > 0, has2 = Y2.size > 0;
  const yLbl = k => (k ? `${yY - k}` : periodText(A.f));
  // the selected period: revenue and units; earlier years: units only; the change is always on units
  const pc = (o, prev, n, q, money) => (o[n] || o[q] ? `${money ? `${egp(o[n])} <b>(${fmtInt(o[q])} U)</b>` : `${fmtInt(o[q])} U`}${prev ? `<div>${deltaChip(chg(o[q], prev[q]))}</div>` : ''}` : '<span class="mini">—</span>');
  const trio = (o, prev, money) => [pc(o, prev, 'n', 'q', money), pc(o, prev, 'cn', 'cq', money), pc(o, prev, 'wn', 'wq', money)];
  // an earlier year in one cell: 10 U (4 C, 6 W), and under it the change in units (with cash and warranty in brackets)
  const ch1 = (a, b) => { const d = chg(a, b); return Number.isFinite(d) ? `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%` : 'n/a'; };
  const one = (o, prev) => (o.q || o.n ? `<b>${fmtInt(o.q)} U</b> <span class="mini">(${fmtInt(o.cq)} C, ${fmtInt(o.wq)} W)</span>${prev ? `<div>${deltaChip(chg(o.q, prev.q))} <span class="mini">(C ${ch1(o.cq, prev.cq)}, W ${ch1(o.wq, prev.wq)})</span></div>` : ''}` : '<span class="mini">—</span>');
  A._partsYears = { Y0, Y1, Y2, has1, has2, lbl: [0, 1, 2].map(yLbl) };
  // the models the part went into this period: the top three by units with their share, the rest on hover
  const modCell = o => { const l = partModels(o); if (!l.length) return '<span class="mini">—</span>'; const all = l.map(([m, sh]) => `${m} ${pct(sh)}`).join(', '); return `<span title="${esc(all)}" style="white-space:nowrap;display:inline-block;text-align:start;line-height:1.35">${l.slice(0, 3).map(([m, sh]) => `<b>${esc(m)}</b> <span class="mini">${pct(sh)}</span>`).join('<br>')}${l.length > 3 ? `<br><span class="mini">+${l.length - 3} more</span>` : ''}</span>`; };
  const head = ['', 'Part number', 'Name', 'Model'].concat([0, 1, 2].filter(k => k === 0 || (k === 1 ? has1 : has2)).flatMap(k => (k ? [`Units ${yLbl(k)}`] : [`Revenue (units) ${yLbl(k)}`, `Cash ${yLbl(k)}`, `Warranty ${yLbl(k)}`])));
  const pRows = shown.map(x => { const a = Y0.get(x.m) || z, b = Y1.get(x.m) || z, c = Y2.get(x.m) || z; return [`<input type="checkbox" class="noprint" data-psel="${esc(x.code)}" ${psel.has(x.code) ? 'checked' : ''} aria-label="Select ${esc(x.code)}">`, `<span style="white-space:nowrap">${esc(x.code)}</span>`, pnInput(x), modCell(a)].concat(trio(a, has1 ? b : null, true)).concat(has1 ? [one(b, has2 ? c : null)] : []).concat(has2 ? [one(c, null)] : []); });
  const nSelHere = mats.filter(x => psel.has(x.code)).length;
  const selBar = `<div class="toolbar" style="margin:-4px 0 12px;align-items:center;gap:8px"><span class="mini" id="psel-n"><b>${fmtInt(psel.size)}</b> part number${psel.size === 1 ? '' : 's'} selected${psel.size !== nSelHere ? ` (${fmtInt(nSelHere)} sold in this period)` : ''}</span><label class="choice" style="min-height:34px"><input type="checkbox" data-act="pselonly" ${A.partSelOnly ? 'checked' : ''} ${psel.size ? '' : 'disabled'}> Show selected only</label><button class="btn small secondary" data-act="pselall" title="Tick every part number found by the search">Select the ${fmtInt(found0.length)} found</button><button class="btn small secondary" data-act="pselclear" ${psel.size ? '' : 'disabled'}>Clear selection</button><span class="mini">With “Show selected only” ticked, the table, the Excel buttons and the Output Excel use the selected part numbers only.</span></div>`;
  return sec(`Part numbers — ${mats.length}`, `${pq ? `${fmtInt(found.length)} match “${esc(A.partQ)}”. ` : ''}Showing ${shown.length} by revenue. ${periodText(A.f)}: revenue and units (U); Model: the models the part was fitted to, with their share of the units (top three; hover for all). Earlier years: units with cash (C) and warranty (W) in brackets. Under each value the change in units against the next column’s year (${periodText(A.f)} against all of ${yY - 1}, and ${yY - 1} against ${yY - 2}), green up, red down. The Excel export adds the units in every branch, with the change against last year.${has1 ? '' : ' Last year is not loaded, so there is no comparison.'}${admin ? ' Type a name for any part number; categories can be set for the found part numbers with the tool above.' : ''}`, ptools + selBar + table(head, pRows, { maxH: 560, xlGroups: () => partYearRows(found).groups, xlBands: { id: 'Part', cur: yLbl(0), y1: yLbl(1), y2: yLbl(2) }, fullHead: () => partYearRows(found).head, fullFn: () => { const T = partYearRows(found); return T.rows.map(r => r.map((v, c) => (/change/.test(T.head[c]) && typeof v === 'number' ? { pct: v } : v))); } }));
}
function pageParts() {
  const S = A.S, P = S.P;
  if (!P || !P.n) return '<div class="section empty"><strong>No parts lines</strong>Parts analysis needs files imported with V2 (the LOP and Material columns). Re-import the transaction files in Data &amp; imports.</div>';
  const ex = partsEx(), exArr = [...ex];
  const cats = S.partCats, nC = cats.length;
  const f = Object.assign(F(), { exCats: exArr });
  const ix = C.selectParts(S, f), tot = C.sumParts(S, ix);
  const all = C.sumParts(S, C.selectParts(S, Object.assign(F(), { exCats: [] })));
  const cur = stats(A.f.s, A.f.e);
  const pa = compByBranch(F(), 'P');
  const vinsPer = cur.sm.vins;
  const exNames = cats.filter(c => ex.has(c.id)).map(c => c.name);
  // groupings of the selected lines
  const grp = keyFn => { const m = new Map(); for (const i of ix) { const k = keyFn(i); let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(i); } return m; };
  const byCatPay = new Map(); for (const i of ix) { const k = P.cat[i] * 3 + P.cw[i]; let a = byCatPay.get(k); if (!a) { a = []; byCatPay.set(k, a); } a.push(i); }
  const cp = (c, w) => C.sumParts(S, byCatPay.get(c * 3 + w) || []);
  const payIx = [[], [], []], catIx = cats.map(() => []), actPx = [[], [], []]; for (const i of ix) { payIx[P.cw[i]].push(i); catIx[P.cat[i]].push(i); actPx[P.act[i]].push(i); }
  const actP = actPx.map(l => C.sumParts(S, l)), actSm = [0, 1].map(a => C.summarize(S, Array.from(cur.idx).filter(i => S.act[i] === a)));
  const byPay = payIx.map(l => C.sumParts(S, l));
  const toggles = `<div class="choices"><span class="mini" style="align-self:center">Leave out:</span>${cats.map(c => `<label class="choice ${ex.has(c.id) ? 'on' : ''}"><input type="checkbox" data-act="partsex" value="${esc(c.id)}" ${ex.has(c.id) ? 'checked' : ''}><i class="sw sq" style="background:${c.color}"></i>${esc(c.name)}</label>`).join('')}</div>`;
  let h = `<div class="section"><div class="sec-head"><div><h2>Parts ${exNames.length ? '— without ' + esc(exNames.join(', ').toLowerCase()) : '— all parts'}</h2><p>Parts lines are invoice lines with LOP = Parts, split by payer (C / W column: cash, warranty). Every part number is put in one category — <b>${cats.map(c => esc(c.name)).join('</b>, <b>')}</b> — by the rules at the bottom of this tab, or by the category you pick for a part number. Tick a category to leave it out of every chart here (for example service items or paint materials). The parts budget covers all parts, so achievement is always against all parts.</p></div></div>${toggles}</div>`;
  h += cards([
    { label: exNames.length ? 'Parts revenue (selected)' : 'Parts revenue', value: egpC(tot.net), note: `${pct(cur.sm.rev ? tot.net / cur.sm.rev : NaN)} of total revenue${exNames.length ? ` · all parts ${egpC(all.net)}` : ''}` },
    { label: 'Parts achievement (all parts)', value: achText(pa.a.ach), note: Number.isFinite(pa.a.ach) ? `${egpC(pa.a.revenue)} of ${egpC(pa.a.target)} parts budget` : 'No parts budget for this period', t: 't-blue' },
    { label: 'Cash parts', value: egpC(byPay[0].net), note: `${pct(tot.net ? byPay[0].net / tot.net : NaN)} of parts · disc. rate ${pct(byPay[0].rate)}`, t: 't-mag' },
    { label: 'Warranty parts', value: egpC(byPay[1].net), note: `${pct(tot.net ? byPay[1].net / tot.net : NaN)} of parts · ${fmtInt(byPay[1].mats)} part numbers`, t: 't-dark' },
    { label: 'Parts per RO', value: egpC(cur.sm.ros ? tot.net / cur.sm.ros : NaN), note: `${fmtInt(cur.sm.ros)} repair orders` },
    { label: 'Parts per VTP', value: egpC(vinsPer ? tot.net / vinsPer : NaN), note: `${fmtInt(vinsPer)} vehicles`, t: 't-amber' },
    { label: 'Parts discount', value: egpC(tot.disc), note: `Rate ${pct(tot.rate)} of gross parts`, t: 't-blue' },
    { label: 'Part numbers sold', value: fmtInt(tot.mats), count: true, note: `${fmtInt(tot.qty)} units · avg price ${egpC(tot.avgPrice)}`, t: 't-mag' },
    { label: 'Parts per RO — EM', value: egpC(actSm[0].ros ? actP[0].net / actSm[0].ros : NaN), note: `${egpC(actP[0].net)} EM parts · ${fmtInt(actSm[0].ros)} EM repair orders` },
    { label: 'Parts per RO — BS', value: egpC(actSm[1].ros ? actP[1].net / actSm[1].ros : NaN), note: `${egpC(actP[1].net)} BS parts · ${fmtInt(actSm[1].ros)} BS repair orders`, t: 't-mag' },
    { label: 'Parts per VTP — EM', value: egpC(actSm[0].vins ? actP[0].net / actSm[0].vins : NaN), note: `${fmtInt(actSm[0].vins)} EM vehicles`, t: 't-amber' },
    { label: 'Parts per VTP — BS', value: egpC(actSm[1].vins ? actP[1].net / actSm[1].vins : NaN), note: `${fmtInt(actSm[1].vins)} BS vehicles`, t: 't-amber' },
    { label: 'Parts discount — EM', value: egpC(actP[0].disc), note: `Rate ${pct(actP[0].rate)} of gross EM parts`, t: 't-blue' },
    { label: 'Parts discount — BS', value: egpC(actP[1].disc), note: `Rate ${pct(actP[1].rate)} of gross BS parts`, t: 't-blue' },
  ], 'Parts key figures');
  h += oilSections();
  // achievement by branch: cash and warranty bars, the parts budget as a marker, achievement on all parts
  const byBr = grp(i => P.br[i]);
  const brRows = [...byBr].map(([bi, l]) => { const lc = [], lw = [], byC = new Array(nC).fill(0); for (const i of l) { if (P.cw[i] === 0) lc.push(i); else if (P.cw[i] === 1) lw.push(i); byC[P.cat[i]] += P.net[i]; } return { label: S.branches[bi], bi, cash: C.sumParts(S, lc), war: C.sumParts(S, lw), s2: C.sumParts(S, l), byC }; }).sort((a, b) => b.s2.net - a.s2.net);
  h += sec('Parts achievement by branch (Cash and warranty)', 'Each bar is the branch’s parts revenue split into cash and warranty; the black mark is the parts budget. Achievement = all parts ÷ parts budget (green ≥ 100%, amber within 10%, red below).', hbars(brRows.map(x => { const t = pa.by.get(x.bi) || { revAll: 0, target: 0 }, ach = t.target > 0 ? t.revAll / t.target : NaN; return { label: x.label, segs: [{ v: x.cash.net, color: 'var(--c4)', name: 'Cash' }, { v: x.war.net, color: 'var(--c5)', name: 'Warranty' }], marker: t.target > 0 ? t.target : 0, value: `<b>${egpC(x.s2.net)}</b>${Number.isFinite(ach) ? ` <span class="ach ${achCls(ach)}">${achPct(ach)}</span>` : ''}`, sub: `cash ${egpC(x.cash.net)} · warranty ${egpC(x.war.net)} (${pct(x.s2.net ? x.war.net / x.s2.net : NaN)})${t.target > 0 ? ` · budget ${egpC(t.target)}` : ' · no budget'}` }; }), { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)'], ['Parts budget', '#151515']], aria: 'Parts achievement by branch, cash and warranty' }));
  // categories, split by payer
  const catRows = cats.map((c, k) => ({ k, c, s: C.sumParts(S, catIx[k]), cash: cp(k, 0), war: cp(k, 1), pdi: cp(k, 2) })).filter(x => x.s.lines);
  h += sec('Parts by category — cash and warranty', 'Each bar is the category’s parts revenue, split into cash and warranty (PDI parts, if any, in grey).', hbars(catRows.sort((a, b) => b.s.net - a.s.net).map(x => ({ label: x.c.name, segs: [{ v: x.cash.net, color: 'var(--c4)', name: 'Cash' }, { v: x.war.net, color: 'var(--c5)', name: 'Warranty' }].concat(x.pdi.net ? [{ v: x.pdi.net, color: 'var(--grey-l)', name: 'PDI' }] : []), value: `<b>${egpC(x.s.net)}</b>`, sub: `${pct(tot.net ? x.s.net / tot.net : NaN)} of parts · ${fmtInt(x.s.mats)} part numbers` })), { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)']], aria: 'Parts by category' }));
  h += sec('Cash and warranty by category', 'Revenue, quantity and discount for each category and payer. Warranty share = warranty ÷ (cash + warranty).', table(['Category', 'Cash revenue', 'Cash units', 'Cash disc. rate', 'Warranty revenue', 'Warranty units', 'Warranty share', 'Total'], catRows.map(x => [`<i class="sw sq" style="background:${x.c.color}"></i> ${esc(x.c.name)}`, egp(x.cash.net), fmtInt(x.cash.qty), pct(x.cash.rate), egp(x.war.net), fmtInt(x.war.qty), pct(x.cash.net + x.war.net ? x.war.net / (x.cash.net + x.war.net) : NaN), egp(x.s.net)]).concat([{ cells: ['Total', egp(byPay[0].net), fmtInt(byPay[0].qty), pct(byPay[0].rate), egp(byPay[1].net), fmtInt(byPay[1].qty), pct(byPay[0].net + byPay[1].net ? byPay[1].net / (byPay[0].net + byPay[1].net) : NaN), egp(tot.net)], _cls: 'total' }])));
  // branches: cash vs warranty, and categories
  h += sec('Parts categories by branch', 'Branch parts revenue split by category.', hbars(brRows.map(x => ({ label: x.label, segs: cats.map((c, k) => ({ v: x.byC[k], color: c.color, name: c.name })).filter(sg => sg.v), value: `<b>${egpC(x.s2.net)}</b>`, sub: cats.map((c, k) => (x.byC[k] ? `${c.name} ${pct(x.s2.net ? x.byC[k] / x.s2.net : NaN)}` : '')).filter(Boolean).slice(0, 3).join(' · ') })), { legend: cats.map(c => [c.name, c.color]), aria: 'Parts categories by branch' }));
  // every part number by branch, and the top 15 RN- part numbers of each branch (cash and warranty)
  h += partsBranchSections();
  // monthly
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  const byM = new Map(); for (const i of ix) { const k = P.ym[i]; let a = byM.get(k); if (!a) { a = []; byM.set(k, a); } a.push(i); }
  const mS = months.map(m => { const l = byM.get(m); if (!l) return null; let all = 0, cash = 0, war = 0; const byC = new Array(nC).fill(0); for (const i of l) { const v = P.net[i]; all += v; if (P.cw[i] === 0) cash += v; else if (P.cw[i] === 1) war += v; byC[P.cat[i]] += v; } return { all: { net: all }, cash: { net: cash }, war: { net: war }, byC }; });
  const missing = months.map(m => !A.coverage.has(m));
  h += `<div class="two">${sec('Cash and warranty parts by month', '', lineChart({ labels: months.map(ymLbl), series: [{ name: 'All parts', color: 'var(--blue)', values: mS.map(x => (x ? x.all.net : null)) }, { name: 'Cash', color: 'var(--c4)', values: mS.map(x => (x ? x.cash.net : null)) }, { name: 'Warranty', color: 'var(--c5)', values: mS.map(x => (x ? x.war.net : null)) }], missing, fmt: 'money', aria: 'Parts by month and payer' }))}${sec('Parts categories by month', '', lineChart({ labels: months.map(ymLbl), series: cats.map((c, k) => ({ name: c.name, color: c.color, values: mS.map(x => (x ? x.byC[k] : null)) })).filter(se => se.values.some(v => v)), missing, fmt: 'money', aria: 'Parts categories by month' }))}</div>`;
  // part numbers
  const byMat = grp(i => P.mat[i]);
  const mats = [...byMat].map(([m, l]) => { let cash = 0, war = 0; for (const i of l) { if (P.cw[i] === 0) cash += P.net[i]; else if (P.cw[i] === 1) war += P.net[i]; } return { code: S.mats[m], m, s2: C.sumParts(S, l), cat: P.cat[l[0]], cash, war }; }).sort((a, b) => b.s2.net - a.s2.net);
  const legCats = cats.map(c => [c.name, c.color]);
  const tn = modelTop(), nPn = Math.min(tn.pn, mats.length) || tn.pn;
  const pnChart = hbars(mats.slice(0, tn.pn).map(x => ({ label: x.code + (partName(x.code) ? ' · ' + partName(x.code) : ''), segs: [{ v: x.s2.net, color: catColor(S, x.cat) }], value: `<b>${egpC(x.s2.net)}</b>`, sub: `${esc(catName(S, x.cat))} · ${fmtInt(x.s2.qty)} units · ${fmtInt(x.s2.ros)} ROs · avg ${egpC(x.s2.avgPrice)}` })), { legend: legCats, wide: true, aria: 'Top part numbers' });
  h += sec(`Top ${nPn} part numbers`, `Revenue, coloured by category, with quantity, RO lines and average unit price, out of ${fmtInt(mats.length)} part numbers. Names come from the schedule files where the part appears there.`, pnChart, modelTopSel('pn'));
  const topPay = (w, name) => { const k = w === 0 ? 'pcash' : 'pwar', all = mats.map(x => ({ x, v: w === 0 ? x.cash : x.war })).filter(o => o.v).sort((a, b) => b.v - a.v), l = all.slice(0, tn[k]); const ch = hbars(l.map(o => ({ label: o.x.code + (partName(o.x.code) ? ' · ' + partName(o.x.code) : ''), segs: [{ v: o.v, color: catColor(S, o.x.cat) }], value: `<b>${egpC(o.v)}</b>`, sub: esc(catName(S, o.x.cat)) })), { wide: true, aria: `Top ${name} parts`, emptyText: `No ${name} parts for these filters.` }); return sec(`Top ${Math.min(tn[k], all.length) || tn[k]} ${name} part numbers`, `Out of ${fmtInt(all.length)} ${name} part numbers.`, ch, modelTopSel(k)); };
  h += `<div class="two">${topPay(0, 'cash')}${topPay(1, 'warranty')}</div>`;
  // by model
  const byMod = grp(i => P.model[i]);
  const modRo = C.groupBy(S, cur.idx, i => S.model[i]);
  const mods = [...byMod].map(([m, l]) => ({ m, l, s2: C.sumParts(S, l) })).sort((a, b) => b.s2.net - a.s2.net).slice(0, 15).map(({ m, l, s2 }) => { const r = modRo.get(m); const ros = r ? C.summarize(S, r).ros : 0; let war = 0; for (const i of l) if (P.cw[i] === 1) war += P.net[i]; return { name: S.models[m], s2, ros, war }; });
  const pmChart = hbars(mods.map(x => ({ label: x.name, segs: [{ v: x.s2.net - x.war, color: 'var(--c4)', name: 'Cash' }, { v: x.war, color: 'var(--c5)', name: 'Warranty' }], value: `<b>${egpC(x.s2.net)}</b>`, sub: `${egpC(x.ros ? x.s2.net / x.ros : NaN)} per RO · ${fmtInt(x.ros)} ROs` })), { legend: [['Cash', 'var(--c4)'], ['Warranty', 'var(--c5)']], aria: 'Parts by model' });
  h += sec(`Parts by model — top ${mods.length}`, 'Parts revenue split into cash and warranty, with parts per repair order for the model.', pmChart);
  // top 30 cash / warranty part numbers, split by the models they went into
  const pnByModel = (w, name) => {
    const list = mats.map(x => ({ x, v: w === 0 ? x.cash : x.war })).filter(o => o.v > 0).sort((a, b) => b.v - a.v).slice(0, 30);
    const per = list.map(o => { const mm = new Map(); for (const i of byMat.get(o.x.m)) if (P.cw[i] === w) mm.set(P.model[i], (mm.get(P.model[i]) || 0) + P.net[i]); return [...mm].filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]); });
    // the models that lead most often get their own colours; every other model is grey
    const tally = new Map(); per.forEach(l => l.forEach(([m, v]) => tally.set(m, (tally.get(m) || 0) + v)));
    const lead = [...tally].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]), col = m => { const k = lead.indexOf(m); return k >= 0 ? `var(--c${k + 1})` : 'var(--grey)'; };
    const rows = list.map((o, k) => { const l = per[k], mv = new Map(l); let other = 0; for (const [m, v] of l) if (!lead.includes(m)) other += v; const segs = lead.map(m => ({ v: mv.get(m) || 0, color: col(m), name: S.models[m] || '—' })); segs.push({ v: other, color: 'var(--grey)', name: 'Other models' });
      return { label: `${k + 1}. ${o.x.code}${partName(o.x.code) ? ' · ' + partName(o.x.code) : ''}`, segs, value: `<b>${egpC(o.v)}</b>`, sub: l.slice(0, 3).map(([m, v]) => `${esc(S.models[m] || '—')} ${pct(v / o.v)}`).join(' · ') + (l.length > 3 ? `<br>${l.length} models in all` : '') }; });
    const ch = hbars(rows, { legend: lead.map(m => [S.models[m] || '—', col(m)]).concat(tally.size > lead.length ? [['Other models', 'var(--grey)']] : []), wide: true, aria: `Top ${name} part numbers by model`, noBrk: true, emptyText: `No ${name} parts for these filters.` });
    return sec(`Top ${list.length || 30} ${name} part numbers by model`, `Each bar is the part number’s ${name} revenue, split by the vehicle models it was fitted to; the three biggest models are named under the value.`, ch);
  };
  h += pnByModel(0, 'cash');
  h += pnByModel(1, 'warranty');
  // per RO + discount by branch
  const brMain = C.groupBy(S, cur.idx, i => S.br[i]);
  const perRo = brRows.map(x => { const r = brMain.get(x.bi); const sm = r ? C.summarize(S, r) : null; return { label: x.label, s2: x.s2, ros: sm ? sm.ros : 0, vins: sm ? sm.vins : 0 }; });
  h += `<div class="two">${sec('Parts per RO by branch', '', hbars(perRo.slice().sort((a, b) => (b.s2.net / (b.ros || 1)) - (a.s2.net / (a.ros || 1))).map(x => ({ label: x.label, segs: [{ v: x.ros ? x.s2.net / x.ros : 0, color: branchColor(x.label) }], value: `<b>${egpC(x.ros ? x.s2.net / x.ros : NaN)}</b>`, sub: `${egpC(x.vins ? x.s2.net / x.vins : NaN)} per VTP` })), { aria: 'Parts per RO by branch' }))}${sec('Parts discount by branch', '', hbars(perRo.slice().sort((a, b) => b.s2.disc - a.s2.disc).map(x => ({ label: x.label, segs: [{ v: Math.max(0, x.s2.disc), color: 'var(--c3)' }], value: `<b>${egpC(x.s2.disc)}</b>`, sub: `${pct(x.s2.net ? x.s2.disc / x.s2.net : NaN)} of parts achieved · rate ${pct(x.s2.rate)}` })), { aria: 'Parts discount by branch' }))}</div>`;
  // advisors (main data — all parts)
  const advB = C.groupBy(S, Array.from(cur.idx).filter(i => S.act[i] !== 2), i => S.adv[i]);
  const advs = [...advB].map(([ai, l]) => ({ label: S.advs[ai], sm: C.summarize(S, l) })).sort((a, b) => b.sm.parts - a.sm.parts).slice(0, 10);
  h += sec('Parts sold by advisor — top 10', 'All parts on the advisor’s repair orders (category choices above do not apply here); PDI excluded.', hbars(advs.map(x => ({ label: x.label, segs: [{ v: x.sm.parts, color: 'var(--c1)' }], value: `<b>${egpC(x.sm.parts)}</b>`, sub: `${egpC(x.sm.partsPerRo)} per RO · ${fmtInt(x.sm.ros)} ROs` })), { aria: 'Parts by advisor' }));
  // price watch: top service items by revenue
  const svcI = cats.findIndex(c => c.id === 'service');
  const svcAll = C.selectParts(S, Object.assign(F(), { exCats: [] }));
  const svcM = new Map(); for (const i of svcAll) if (P.cat[i] === svcI) { const k = P.mat[i]; let a = svcM.get(k); if (!a) { a = []; svcM.set(k, a); } a.push(i); }
  const svcTop = [...svcM].map(([m, l]) => ({ code: S.mats[m], m, s2: C.sumParts(S, l) })).sort((a, b) => b.s2.net - a.s2.net).slice(0, 15);
  const monthMat = months.map(m => { const mm = new Map(); for (const i of C.selectParts(S, Object.assign(F(), { s: m, e: m, exCats: [] }))) { const k = P.mat[i]; let l = mm.get(k); if (!l) { l = []; mm.set(k, l); } l.push(i); } return mm; });
  const priceRows = svcTop.map(x => { const ps = monthMat.map(mm => { const s2 = C.sumParts(S, mm.get(x.m) || []); return s2.qty ? s2.avgPrice : NaN; }); const fin = ps.filter(Number.isFinite); const first = fin[0], last = fin[fin.length - 1]; return [esc(x.code), esc(partName(x.code) || ''), egp(x.s2.net), fmtInt(x.s2.qty)].concat(ps.map(v => (Number.isFinite(v) ? fmtInt(v) : '—'))).concat([fin.length > 1 ? trendMark(last, first, true) : '—']); });
  h += sec('Service-item price watch', 'Average unit price (revenue ÷ quantity) of the top service items by month. The arrow compares the last month with the first; a rise is shown in red.', table(['Part', 'Name', 'Revenue', 'Units'].concat(months.map(ymLbl)).concat(['Change']), priceRows));
  h += partNumbersSec(mats);
  h += oilSettings();
  h += categorySettings();
  h += serviceSettings();
  A._partsCsv = A.partSelOnly && partSel().size ? mats.filter(x => partSel().has(x.code)) : mats;
  return h;
}
function categorySettings() {
  const admin = isAdmin(), S = A.S, P = S.P, cfg = A.cfg, list = cfg.partCats || [];
  // biggest part numbers that no rule picked up (Repair parts), across all saved data
  const oth = S.partCats.findIndex(c => c.id === 'other');
  const m = new Map(); for (let i = 0; i < P.n; i++) if (P.cat[i] === oth) { const k = P.mat[i]; m.set(k, (m.get(k) || 0) + P.net[i]); }
  const top = [...m].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const ov = Object.entries(cfg.partOverride || {});
  const rows = list.map((c, k) => `<tr><td><input class="inp" data-pc="${k}.name" value="${esc(c.name || '')}" ${admin ? '' : 'disabled'}></td><td><input class="inp" data-pc="${k}.prefixes" value="${esc((c.prefixes || []).join(', '))}" placeholder="LOR-DX, LOR-XB" ${admin ? '' : 'disabled'}></td><td><input class="inp" data-pc="${k}.pattern" value="${esc(c.pattern || '')}" placeholder="pattern, e.g. \\d{3}/\\d{2}/\\d{2}" ${admin ? '' : 'disabled'}></td><td><input class="inp" data-pc="${k}.jobs" value="${esc(c.jobs || '')}" placeholder="job words, e.g. دهان|paint" ${admin ? '' : 'disabled'}></td><td><input class="inp" data-pc="${k}.jobsSkip" value="${esc((c.jobsSkip || []).join(', '))}" placeholder="e.g. RN-" ${admin ? '' : 'disabled'}></td><td class="num">${admin ? `<button class="btn small secondary" data-act="pcup" data-i="${k}" ${k ? '' : 'disabled'} title="Check earlier">↑</button> <button class="btn small secondary" data-act="pcdel" data-i="${k}">Remove</button>` : ''}</td></tr>`).join('');
  let body = `<p>Rules are checked from the top; the first category that matches a part number wins. <b>Service items</b> use the service-part rules below; anything that matches nothing is a <b>Repair part</b>. Job words match the job description on the invoice line (paint jobs are read from files imported from now on; older files are classified by part number only).</p>
  <div class="scroll"><table class="table"><thead><tr><th>Category</th><th>Part-number prefixes</th><th>Part-number pattern</th><th>Job description words</th><th>…but not for prefixes</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  ${admin ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn" data-act="pcsave">Apply rules</button><button class="btn secondary" data-act="pcadd">Add category</button></div>` : ''}`;
  if (top.length) body += `<h3>Largest unclassified part numbers (counted as repair parts)</h3>` + table(['Part number', 'Name', 'Revenue (all saved data)', 'Category'], top.map(([mi, v]) => { const code = S.mats[mi]; return [esc(code), esc(partName(code)), egp(v), admin ? `<select class="cell" data-act="partcat" data-code="${esc(code)}"><option value="">Repair parts</option>${S.partCats.filter(c => c.id !== 'other').map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>` : 'Repair parts']; }), { align: ['', '', 'num', ''], maxH: 360 });
  if (ov.length) body += `<h3>Part numbers classified by hand · ${ov.length}</h3>` + table(['Part number', 'Category', ''], ov.map(([code, id]) => [esc(code), esc((S.partCats.find(c => c.id === id) || { name: id }).name), admin ? `<button class="btn small secondary" data-act="partcatdel" data-code="${esc(code)}">Back to rules</button>` : '']), { align: ['', '', 'num'], maxH: 300 });
  return sec('Part categories', admin ? 'Changes apply to all saved data immediately.' : 'Read-only for members.', body);
}

/* ======================= engine oil consumed (litres and kg) ======================= */
// weights from litres per tonne: LO-9004 / LO-9001 1,177 L = 1 t (0.8496 kg per litre); LO-INEO4 / LO-INEO1 1,172 L = 1 t (0.8532 kg per litre)
const OIL_DEFAULT = [{ code: 'LO-9004', l: 4, kg: 3.3985 }, { code: 'LO-INEO4', l: 4, kg: 3.413 }, { code: 'LO-9001', l: 1, kg: 0.8496 }, { code: 'LO-INEO1', l: 1, kg: 0.8532 }];
// a saved list still holding the old standard weights (3.64 / 3.65 / 0.91 / 0.9125 kg) takes the new standard weights
const OIL_OLD_KG = { 'LO-9004': 3.64, 'LO-INEO4': 3.65, 'LO-9001': 0.91, 'LO-INEO1': 0.9125 };
const oilList = () => { const l = Array.isArray(A.cfg.oils) && A.cfg.oils.length ? A.cfg.oils : null; if (!l) return OIL_DEFAULT; return l.map(x => { const d = OIL_DEFAULT.find(y => y.code === x.code); return d && OIL_OLD_KG[x.code] === Number(x.kg) && Number(x.l) === d.l ? Object.assign({}, x, { kg: d.kg }) : x; }); };
const OIL_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--grey)', 'var(--amber)', 'var(--grey-l)', 'var(--mag)'];
const fmtL = v => (Number.isFinite(v) ? fmtInt(Math.round(v)) + ' L' : 'N/A'), fmtKg = v => (Number.isFinite(v) ? fmtInt(Math.round(v)) + ' kg' : 'N/A');
/* oils of the same grade in different can sizes go on one card: LO-9004 with LO-9001, LO-INEO4 with LO-INEO1 (same code without the last digit) */
function oilFamilies(oils) {
  const g = new Map(); oils.forEach((o, k) => { const key = String(o.code).toUpperCase().replace(/\d$/, ''); if (!g.has(key)) g.set(key, []); g.get(key).push(k); });
  return [...g.values()].slice(0, 2);
}
let oilCache = { S: null, m: new Map() };
function oilCalc(f) {
  const key = JSON.stringify([f, oilList()], (k, v) => (v instanceof Set ? [...v] : v));
  if (oilCache.S !== A.S) oilCache = { S: A.S, m: new Map() };
  if (oilCache.m.has(key)) return oilCache.m.get(key);
  const res = oilCalc0(f); if (oilCache.m.size > 8) oilCache.m.clear(); oilCache.m.set(key, res); return res;
}
function oilCalc0(f) {
  const S = A.S, P = S.P, oils = oilList(), byCode = new Map();
  oils.forEach((o, k) => { const mi = S.mats.indexOf(String(o.code).trim().toUpperCase()); if (mi >= 0) byCode.set(mi, k); });
  const ix = C.selectParts(S, Object.assign(f, { exCats: [] }));
  const big = oils.map(o => (Number(o.l) || 0) >= 2); // the 4-L cans: one per oil change
  const z = () => ({ q: oils.map(() => 0), n: oils.map(() => 0), l: 0, kg: 0, cashL: 0, warL: 0, net: 0, ros: 0, rosAny: 0 });
  const tot = z(), br = new Map(), ym = new Map();
  for (const i of ix) {
    const k = byCode.get(P.mat[i]); if (k === undefined) continue;
    const o = oils[k], q = P.qty[i], l = q * (Number(o.l) || 0), kg = q * (Number(o.kg) || 0);
    for (const a of [tot, br.get(P.br[i]) || (br.set(P.br[i], z()), br.get(P.br[i])), ym.get(P.ym[i]) || (ym.set(P.ym[i], z()), ym.get(P.ym[i]))]) { a.q[k] += q; a.n[k] += P.net[i]; a.l += l; a.kg += kg; a.net += P.net[i]; a.rosAny += P.ros[i]; if (big[k]) a.ros += P.ros[i]; if (P.cw[i] === 0) a.cashL += l; else if (P.cw[i] === 1) a.warL += l; }
  }
  return { oils, tot, br, ym, found: byCode.size };
}
function oilSections() {
  const S = A.S, oils = oilList(), admin = isAdmin();
  const cur = stats(A.f.s, A.f.e), o = oilCalc(F());
  const lyS = C.ymAdd(A.f.s, -12), lyE = C.ymAdd(A.f.e, -12), ly = oilCalc(F({ s: lyS, e: lyE })), hasLy = [...ly.ym.keys()].length > 0;
  const t = o.tot, vins = cur.sm.vins;
  const oilName = x => `${esc(x.code)} (${fmtNum1(Number(x.l))} L)`;
  // one line per oil under the litres and the weight: cans sold and what they add up to
  const fmtT = kg => `${(kg / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`;
  const fmtM3 = l => `${(l / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³`;
  const two = (a, b) => `${a} <span style="font-size:.6em;font-weight:600;color:var(--muted)">(${b})</span>`;
  const famLines = kg => oilFamilies(oils).filter(fam => fam.length > 1).map(fam => { const v = fam.reduce((a, k) => a + t.q[k] * (Number(kg ? oils[k].kg : oils[k].l) || 0), 0); return `<div><b>${fam.map(k => esc(oils[k].code)).join(' + ')}: ${kg ? `${fmtKg(v)} (${fmtT(v)})` : `${fmtL(v)} (${fmtM3(v)})`}</b></div>`; }).join('');
  const canLines = kg => oils.map((x, k) => { const per = Number(kg ? x.kg : x.l) || 0, q = t.q[k]; return `<div>${esc(x.code)}: <b>${fmtInt(q)}</b> cans × ${kg ? String(per) + ' kg' : fmtNum1(per) + ' L'} = ${kg ? `${fmtKg(q * per)} (${fmtT(q * per)})` : `${fmtL(q * per)} (${fmtM3(q * per)})`}</div>`; }).join('');
  let h = cards([
    { label: 'Oil consumed', value: two(fmtL(t.l), fmtM3(t.l)), note: `${canLines(false)}<div style="margin-top:4px">${famLines(false)}</div><div style="margin-top:4px">1 m³ = 1,000 L${hasLy ? ` · same period last year ${fmtL(ly.tot.l)} ${deltaChip(chg(t.l, ly.tot.l))}` : ''}</div>`, t: 't-blue' },
    { label: 'Oil weight', value: two(fmtKg(t.kg), fmtT(t.kg)), note: `${canLines(true)}<div style="margin-top:4px">${famLines(true)}</div><div style="margin-top:4px">1 t = 1,000 kg</div>` },
    { label: 'Oil revenue', value: egpC(t.net), note: `${t.l ? egp(t.net / t.l) : 'N/A'} per litre`, t: 't-mag' },
    { label: 'Litres per VTP', value: vins ? fmtNum1(t.l / vins) : 'N/A', note: `${fmtInt(vins)} vehicles in the period`, t: 't-amber' },
    { label: 'Cash oil', value: fmtL(t.cashL), note: `${pct(t.l ? t.cashL / t.l : NaN)} of litres` },
    { label: 'Warranty oil', value: fmtL(t.warL), note: `${pct(t.l ? t.warL / t.l : NaN)} of litres`, t: 't-dark' },
    ...oilFamilies(oils).map(fam => { const q = fam.reduce((a, k) => a + t.q[k], 0); return { label: `${fam.map(k => oils[k].code).join(' & ')} cans`, value: fmtInt(q), count: true, note: fam.map(k => `${esc(oils[k].code)}: <b>${fmtInt(t.q[k])}</b> cans = ${fmtL(t.q[k] * oils[k].l)} · ${fmtKg(t.q[k] * oils[k].kg)}`).map(x => `<div>${x}</div>`).join('') + `<div style="margin-top:4px">Together ${fmtL(fam.reduce((a, k) => a + t.q[k] * oils[k].l, 0))} · ${fmtKg(fam.reduce((a, k) => a + t.q[k] * oils[k].kg, 0))}</div>` }; }),
  ], 'Oil key figures');
  // by month: litres of each oil and the total
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  const perL = (a, k) => { if (!a) return null; const l = k == null ? a.l : a.q[k] * oils[k].l, n = k == null ? a.net : a.n[k]; return l > 0 ? n / l : null; };
  const rplChart = lineChart({ labels: months.map(ymLbl), fmt: 'int', missing: months.map(m => !A.coverage.has(m)), series: [{ name: 'All oil (EGP per litre)', color: 'var(--fg)', values: months.map(m => perL(o.ym.get(m))) }].concat(oils.map((x, k) => ({ name: x.code, color: OIL_COLORS[k % OIL_COLORS.length], values: months.map(m => perL(o.ym.get(m), k)) }))) });
  h += sec('Oil consumed by month — litres', `Litres = units sold × can size (${oils.map(x => `${esc(x.code)} ${fmtNum1(Number(x.l))} L`).join(', ')}). Weight uses ${oils.map(x => `${esc(x.code)} ${x.kg} kg`).join(', ')}. Below: oil revenue per litre each month (net invoiced revenue ÷ litres, after discounts).`, lineChart({ labels: months.map(ymLbl), fmt: 'int', missing: months.map(m => !A.coverage.has(m)), series: [{ name: 'All oil (litres)', color: 'var(--fg)', values: months.map(m => (o.ym.get(m) ? o.ym.get(m).l : null)) }].concat(oils.map((x, k) => ({ name: x.code, color: OIL_COLORS[k % OIL_COLORS.length], values: months.map(m => (o.ym.get(m) ? o.ym.get(m).q[k] * x.l : null)) }))) }) + `<h3 style="margin:18px 0 6px">Revenue per litre — EGP</h3>` + rplChart);
  // by branch
  const vBr = new Map(); for (const [b, l] of C.groupBy(S, cur.idx, i => S.br[i])) vBr.set(b, C.summarize(S, l).vins);
  const lyBr = ly.br;
  const rBr = new Map(); for (const [b, l] of C.groupBy(S, cur.idx, i => S.br[i])) rBr.set(b, C.summarize(S, l).ros);
  const row = (name, a, v, lyA, allRos) => [name, ...oils.map((x, k) => fmtInt(Math.round(a.q[k] * x.l))), `<b>${fmtInt(Math.round(a.l))}</b>`, fmtInt(Math.round(a.kg)), `<b>${fmtInt(a.ros)}</b>`, a.ros ? fmtNum1(a.l / a.ros) : 'N/A', allRos ? `${fmtInt(allRos)} <span class="mini">(${pct(a.ros / allRos)} oil)</span>` : 'N/A', fmtInt(Math.round(a.cashL)), fmtInt(Math.round(a.warL)), egpC(a.net), a.l ? egp(a.net / a.l) : 'N/A', v ? fmtNum1(a.l / v) : 'N/A', hasLy ? (lyA && lyA.l ? `${fmtInt(Math.round(lyA.l))} ${deltaChip(chg(a.l, lyA.l))}` : '—') : '<span class="mini">not loaded</span>'];
  const brs = [...o.br.keys()].sort((a, b) => o.br.get(b).l - o.br.get(a).l);
  const rows = brs.map(b => row(esc(S.branches[b]), o.br.get(b), vBr.get(b), lyBr.get(b), rBr.get(b)));
  rows.push({ _cls: 'total', cells: row('Network', t, vins, ly.tot, cur.sm.ros) });
  h += sec('Oil consumed by branch', `Oil-change ROs = repair orders with a 4-L can (${oils.filter(x => Number(x.l) >= 2).map(x => esc(x.code)).join(' or ')}); a 1-L can is usually a top-up on the same RO. Litres per RO = all oil litres ÷ oil-change ROs. All ROs = every repair order of the branch, with the share that had an oil change. Also: litres of each oil, total litres and kilograms, cash and warranty litres, oil revenue, revenue per litre, litres per VTP, and the same period last year (${ymLbl(lyS)}${lyS !== lyE ? ' – ' + ymLbl(lyE) : ''}).`, o.found ? table(['Branch', ...oils.map(oilName), 'Total litres', 'Total kg', 'Oil-change ROs', 'Litres per RO', 'All ROs', 'Cash litres', 'Warranty litres', 'Oil revenue', 'EGP per litre', 'Litres per VTP', 'Litres last year'], rows) : `<div class="empty"><strong>None of the oil part numbers are in the data</strong>Check the part numbers in the oil list below.</div>`);
  return h;
}
/* the oil list (part number, litres per unit, kg per unit), at the end of the Parts tab */
function oilSettings() {
  const oils = oilList(), admin = isAdmin(), link = A.cfg.oilLink || 'off'; let h = '';
  const dens = x => (x.l > 0 ? x.kg / x.l : 0);
  const lr = oils.map((x, k) => `<tr><td><input class="inp" data-oil="${k}.code" value="${esc(x.code)}" ${admin ? '' : 'disabled'}></td><td class="num"><input class="inp" type="number" step="0.001" style="width:90px" data-oil="${k}.l" value="${+(+x.l).toFixed(4)}" ${admin ? '' : 'disabled'}></td><td class="num"><input class="inp" type="number" step="0.0001" style="width:90px" data-oil="${k}.kg" value="${+(+x.kg).toFixed(4)}" ${admin ? '' : 'disabled'}></td><td class="num"><input class="inp" type="number" step="0.001" style="width:90px" data-oil="${k}.d" value="${+dens(x).toFixed(4)}" ${admin ? '' : 'disabled'} title="Kg per litre (weight ÷ litres)"></td><td class="num"><input class="inp" type="number" step="1" style="width:90px" data-oil="${k}.t" value="${dens(x) > 0 ? Math.round(1000 / dens(x)) : ''}" ${admin ? '' : 'disabled'} title="Litres in one tonne (1,000 kg)"></td><td class="mini">${esc(partName(String(x.code).toUpperCase()) || '')}</td><td>${admin ? `<button class="btn secondary" data-act="oildel" data-k="${k}">Remove</button>` : ''}</td></tr>`).join('');
  h += `<div class="section"><details ${A._oilOpen ? 'open' : ''}><summary style="cursor:pointer;font-weight:600">Oil list — part numbers, litres and kg per unit${admin ? ' (edit)' : ''}</summary><div class="scroll"><table class="table"><thead><tr><th>Part number</th><th class="num">Litres per unit</th><th class="num">Kg per unit</th><th class="num">Kg per litre</th><th class="num">Litres per tonne</th><th>Name</th><th></th></tr></thead><tbody>${lr}</tbody></table></div>${admin ? `<div class="toolbar" style="margin:10px 0 4px;align-items:flex-end"><div class="field wide"><label for="oil-link">When I change a value</label><select id="oil-link" class="inp" data-oillink="1"><option value="off" ${link === 'off' ? 'selected' : ''}>Keep litres and kg separate</option><option value="l" ${link === 'l' ? 'selected' : ''}>Update litres from the weight (litres = kg ÷ kg per litre)</option><option value="kg" ${link === 'kg' ? 'selected' : ''}>Update the weight from litres (kg = litres × kg per litre)</option></select></div></div><p class="mini">Kg per litre is the oil's weight per litre; litres per tonne is how many litres make 1,000 kg (LO-9004 1,177 L, LO-INEO4 1,172 L). With “Keep litres and kg separate” or “Update the weight from litres”, changing either one recalculates the weight of each can from its litres. With “Update litres from the weight”, typing a new kg changes the litres; typing a new kg per litre recalculates the litres from the weight.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn secondary" data-act="oiladd">Add oil</button><button class="btn secondary" data-act="oilreset">Back to the 4 standard oils</button></div><p class="mini">Other oil codes in the data (for example LO-9004C, LO-INEO4C, LO-9001C, LO-INEO1C, LO-5) are not counted unless you add them here.</p>` : ''}</details></div>`;
  return h;
}

/* ======================= page: revenue per work bay ======================= */
function capOf(unit) { const c = (A.cfg.capacity || {})[unit] || {}; return { bays: Number(c.bays) || 0, techs: Number(c.techs) || 0 }; }
function pageBays() {
  const S = A.S, cur = stats(A.f.s, A.f.e), admin = isAdmin();
  const hrsDay = Number(A.cfg.capHours) || 8;
  // working days: from the target file of each month; months without one count their billing days; months without data count nothing
  let wd = 0, fromBill = 0;
  for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) { if (!A.coverage.has(m)) continue; const d = workingDays(m, m).wd; if (Number.isFinite(d) && d) wd += d; else { const ds = new Set(); for (const i of cur.idx) if (S.ym[i] === m) ds.add(S.day[i]); wd += ds.size; fromBill++; } }
  const wdNote = fromBill ? `working days (billing days used for ${fromBill} month${fromBill > 1 ? 's' : ''} without a target file)` : 'working days from the target files';
  const byU = C.groupBy(S, cur.idx, i => S.unit[i]);
  const perm = curSet(false);
  const unitIds = new Set([...byU.keys()]);
  S.units.forEach((u, ui) => { if ((!perm || perm.has(S.unitBranch[ui])) && ((C.STANDARD_UNITS || []).includes(u) || capOf(u).bays)) unitIds.add(ui); });
  const rows = [...unitIds].map(ui => { const name = S.units[ui], l = byU.get(ui) || []; const sm = C.summarize(S, l); const c = capOf(name); return { ui, name, branch: S.branches[S.unitBranch[ui]], scope: S.unitScope[ui], sm, bays: c.bays, techs: c.techs, perBay: c.bays ? sm.rev / c.bays : NaN, perBayDay: c.bays && wd ? sm.rev / c.bays / wd : NaN, rosBayDay: c.bays && wd ? sm.entries / c.bays / wd : NaN, perTech: c.techs ? sm.rev / c.techs : NaN, labTech: c.techs ? sm.labour / c.techs : NaN, hrsTechDay: c.techs && wd ? sm.hours / c.techs / wd : NaN, prod: c.techs && wd ? sm.hours / (c.techs * wd * hrsDay) : NaN }; })
    .sort((a, b) => ((BRANCH_ORDER.indexOf(a.branch) + 1 || 99) - (BRANCH_ORDER.indexOf(b.branch) + 1 || 99)) || (a.scope === 'EM' ? -1 : 1) - (b.scope === 'EM' ? -1 : 1));
  const withBays = rows.filter(r => r.bays), withTechs = rows.filter(r => r.techs);
  const T = rows.reduce((t, r) => { t.rev += r.sm.rev; t.lab += r.sm.labour; t.hrs += r.sm.hours; t.ent += r.sm.entries; if (r.bays) { t.bays += r.bays; t.revB += r.sm.rev; t.entB += r.sm.entries; } if (r.techs) { t.techs += r.techs; t.revT += r.sm.rev; t.hrsT += r.sm.hours; t.labT += r.sm.labour; } return t; }, { rev: 0, lab: 0, hrs: 0, ent: 0, bays: 0, techs: 0, revB: 0, entB: 0, revT: 0, hrsT: 0, labT: 0 });
  let h = '';
  if (!withBays.length && !withTechs.length) h += `<div class="notice"><b>Add the number of working bays and technicians</b> for each unit in the table at the bottom of this tab${admin ? '' : ' (an administrator can do this)'}. Revenue per bay and per technician appear as soon as they are saved.</div>`;
  h += cards([
    { label: 'Revenue per bay', value: egpC(T.bays ? T.revB / T.bays : NaN), note: `${fmtInt(T.bays)} bays · ${periodText(A.f)}` },
    { label: 'Revenue per bay per working day', value: egpC(T.bays && wd ? T.revB / T.bays / wd : NaN), note: `${fmtInt(wd)} ${wdNote}`, t: 't-blue' },
    { label: 'Car entries per bay per day', value: T.bays && wd ? (T.entB / T.bays / wd).toFixed(2) : 'N/A', note: `${fmtInt(T.entB)} repair orders (PDI excluded)`, t: 't-mag' },
    { label: 'Revenue per technician', value: egpC(T.techs ? T.revT / T.techs : NaN), note: `${fmtInt(T.techs)} technicians`, t: 't-dark' },
    { label: 'Labour per technician', value: egpC(T.techs ? T.labT / T.techs : NaN), note: 'Labour revenue ÷ technicians', t: 't-amber' },
    { label: 'Sold hours per technician per day', value: T.techs && wd ? (T.hrsT / T.techs / wd).toFixed(2) : 'N/A', note: `${fmtInt(T.hrsT)} labour hours billed`, t: 't-blue' },
    { label: 'Productivity', value: pct(T.techs && wd ? T.hrsT / (T.techs * wd * hrsDay) : NaN), note: `Sold hours ÷ (technicians × days × ${hrsDay} h)`, t: 't-mag' },
    { label: 'Bays per technician', value: T.techs && T.bays ? (T.bays / T.techs).toFixed(2) : 'N/A', note: 'Units with both numbers set', t: 't-dark' },
  ], 'Work bay key figures');
  const bar = (list, valFn, fmtV, subFn, color, title, desc, aria, max) => sec(title, desc, hbars(list.filter(r => Number.isFinite(valFn(r))).sort((a, b) => valFn(b) - valFn(a)).map(r => ({ label: r.name, segs: [{ v: valFn(r), color: color || branchColor(r.branch) }], value: `<b>${fmtV(valFn(r))}</b>`, sub: subFn(r) })), { aria, max, emptyText: 'Set the number of bays / technicians below.' }));
  h += bar(withBays, r => r.perBay, egpC, r => `${fmtInt(r.bays)} bays · ${egpC(r.perBayDay)} per bay per day`, null, 'Revenue per work bay by unit', `Unit revenue for the period ÷ working bays. ${wdNote[0].toUpperCase() + wdNote.slice(1)}: ${fmtInt(wd)}.`, 'Revenue per bay');
  h += `<div class="two">${bar(withBays, r => r.perBayDay, egpC, r => `${egpC(r.sm.rev)} · ${fmtInt(r.bays)} bays`, 'var(--c1)', 'Revenue per bay per working day', '', 'Revenue per bay per day')}${bar(withBays, r => r.rosBayDay, v => v.toFixed(2), r => `${fmtInt(r.sm.entries)} car entries`, 'var(--c4)', 'Car entries per bay per day', 'Repair orders without PDI ÷ bays ÷ working days.', 'Entries per bay per day')}</div>`;
  h += `<div class="two">${bar(withTechs, r => r.perTech, egpC, r => `${fmtInt(r.techs)} technicians · labour ${egpC(r.labTech)} each`, 'var(--c2)', 'Revenue per technician', '', 'Revenue per technician')}${bar(withTechs, r => r.prod, pct, r => `${Number.isFinite(r.hrsTechDay) ? r.hrsTechDay.toFixed(2) : '—'} sold hours per technician per day`, 'var(--c3)', 'Technician productivity', `Billed labour hours ÷ (technicians × working days × ${hrsDay} hours).`, 'Productivity', 1)}</div>`;
  // monthly trend of revenue per bay (network, units with bays)
  const months = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) months.push(m);
  const bayUnits = new Set(withBays.map(r => r.ui));
  const perMonth = months.map(m => { const st = stats(m, m); let rev = 0, ent = 0; for (const i of st.idx) if (bayUnits.has(S.unit[i])) { rev += S.net[i]; } const sm = C.summarize(S, Array.from(st.idx).filter(i => bayUnits.has(S.unit[i]))); ent = sm.entries; const d = Number.isFinite(st.days.wd) && st.days.wd ? st.days.wd : NaN; return { rev, ent, d }; });
  if (T.bays) h += sec('Revenue per bay by month', 'Units with bays set; the same bay numbers are used for every month.', lineChart({ labels: months.map(ymLbl), series: [{ name: 'Revenue per bay', color: 'var(--blue)', values: perMonth.map(x => x.rev / T.bays) }, { name: 'Revenue per bay per day', color: 'var(--c2)', values: perMonth.map(x => (Number.isFinite(x.d) ? x.rev / T.bays / x.d : null)) }], missing: months.map(mm => !A.coverage.has(mm)), fmt: 'money', aria: 'Revenue per bay by month' }));
  // branch totals
  const byB = new Map(); for (const r of rows) { const o = byB.get(r.branch) || { name: r.branch, rev: 0, bays: 0, techs: 0, revB: 0, revT: 0, hrsT: 0 }; o.rev += r.sm.rev; if (r.bays) { o.bays += r.bays; o.revB += r.sm.rev; } if (r.techs) { o.techs += r.techs; o.revT += r.sm.rev; o.hrsT += r.sm.hours; } byB.set(r.branch, o); }
  h += sec('Branches — EM and BS together', '', table(['Branch', 'Bays', 'Technicians', 'Revenue', 'Revenue per bay', 'Per bay per day', 'Revenue per technician', 'Productivity'], [...byB.values()].map(o => [esc(o.name), fmtInt(o.bays), fmtInt(o.techs), egp(o.rev), egp(o.bays ? o.revB / o.bays : NaN), egp(o.bays && wd ? o.revB / o.bays / wd : NaN), egp(o.techs ? o.revT / o.techs : NaN), pct(o.techs && wd ? o.hrsT / (o.techs * wd * hrsDay) : NaN)]).concat([{ cells: ['Network', fmtInt(T.bays), fmtInt(T.techs), egp(T.rev), egp(T.bays ? T.revB / T.bays : NaN), egp(T.bays && wd ? T.revB / T.bays / wd : NaN), egp(T.techs ? T.revT / T.techs : NaN), pct(T.techs && wd ? T.hrsT / (T.techs * wd * hrsDay) : NaN)], _cls: 'total' }])));
  // capacity table (editable)
  const inp = (r, k) => (admin ? `<input class="cell" type="number" min="0" step="1" inputmode="numeric" data-cap="${esc(r.name)}|${k}" value="${r[k] || ''}" placeholder="0" style="width:80px">` : fmtInt(r[k]));
  const capBody = `<div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field" style="max-width:220px"><label for="cap-h">Available hours per technician per day</label><input id="cap-h" class="inp" type="number" min="1" max="24" step="0.5" data-caph="1" value="${hrsDay}" ${admin ? '' : 'disabled'}></div><p class="mini" style="margin:0;flex:2">${admin ? 'Type the numbers and they are saved for everyone straight away. Use the bays and technicians that work in each unit (EM = mechanical, BS = body shop).' : 'Set by an administrator.'}</p></div>` +
    table(['Unit', 'Working bays', 'Technicians', 'Revenue', 'Car entries', 'Sold hours', 'Revenue per bay', 'Per bay per day', 'Entries per bay per day', 'Revenue per technician', 'Sold hours per tech per day', 'Productivity'], rows.map(r => [esc(r.name), inp(r, 'bays'), inp(r, 'techs'), egp(r.sm.rev), fmtInt(r.sm.entries), fmtInt(r.sm.hours), egp(r.perBay), egp(r.perBayDay), Number.isFinite(r.rosBayDay) ? r.rosBayDay.toFixed(2) : '—', egp(r.perTech), Number.isFinite(r.hrsTechDay) ? r.hrsTechDay.toFixed(2) : '—', pct(r.prod)]), { maxH: 640 });
  h += sec('Bays, technicians and results by unit', `Revenue follows the filters above (period, branch, activity, payer). ${periodText(A.f)} · ${fmtInt(wd)} ${wdNote}.`, capBody);
  return h;
}

/* ======================= comparison engine =======================
   Any tab is drawn twice — once for side A, once for side B — and every numbered chart, table,
   key figure and insight list is paired by its number and shown as A against B with the change. */
const TAB_FN = { overview: () => pageOverview(), ops: () => pageOps(), vtp: () => pageVtp(), alerts: () => pageAlerts(), trends: () => pageTrends(), branches: () => pageBranches(), bays: () => pageBays(), parts: () => pageParts(), labour: () => pageLabour(), models: () => pageModels(), advisors: () => pageAdvisors(), customers: () => pageCustomers(), pdi: () => pagePdi(), followup: () => pageFollowup(), cwdetail: () => pageCwDetail(), focus: () => pageFocus(), history: () => pageHistory() };
const CMP_TABS = () => PAGES.filter(p => TAB_FN[p.id]);
function monthsIn(f) { let n = 0; for (let m = f.s; m <= f.e; m = C.ymAdd(m, 1)) n++; return n; }
function shiftFilter(f, kind) {
  const g = Object.assign({}, f);
  if (kind === 'ly') { g.s = f.s - 100; g.e = f.e - 100; }
  else { const n = monthsIn(f); g.e = C.ymAdd(f.s, -1); g.s = C.ymAdd(g.e, -(n - 1)); }
  return g;
}
const periodText = f => (f.s === f.e ? ymLbl(f.s) : `${ymLbl(f.s)} – ${ymLbl(f.e)}`);
function sideLabels(fa, fb) {
  const diff = k => (fa[k] || 'all') !== (fb[k] || 'all');
  const one = (f, other) => {
    const bits = [periodText(f)];
    if (diff('branch')) bits.push(f.branch === 'all' ? 'All branches' : f.branch);
    if (diff('act')) bits.push(f.act === 'all' ? 'EM + BS + PDI' : f.act.replace('+', ' + '));
    if (diff('pay')) bits.push(PAY_NAMES[f.pay || 'all']);
    return bits.join(' · ');
  };
  let a = one(fa, fb), b = one(fb, fa);
  if (a === b) { a = 'A · ' + a; b = 'B · ' + b; }
  return [a, b];
}
function hasData(f) { const S = A.S; for (let m = f.s; m <= f.e; m = C.ymAdd(m, 1)) if (A.coverage.has(m)) return true; return false; }
function runTab(pid, f) {
  const i = PAGES.findIndex(p => p.id === pid);
  return withFilter(f, () => { numReset(i); let html = ''; try { html = TAB_FN[pid](); } catch (e) { console.error(e); html = ''; } return NUM.items.slice(); });
}
/* "EGP 8.16M (104.2% of 49.9M)" → 8160000; "104.2%" → 1.042 (pct) */
function parseVal(t) {
  if (t == null) return { v: NaN, pct: false };
  const s = String(t).replace(/−/g, '-');
  const m = s.match(/(-?\d[\d,]*(?:\.\d+)?)\s*([KMB])?(\s*%|\s*pp)?/i);
  if (!m) return { v: NaN, pct: false };
  let v = Number(m[1].replace(/,/g, '')); const suf = (m[2] || '').toUpperCase();
  if (v > 0 && /-\s*(EGP\s*)?$/.test(s.slice(0, m.index))) v = -v; // a minus before "EGP" 
  if (suf === 'K') v *= 1e3; else if (suf === 'M') v *= 1e6; else if (suf === 'B') v *= 1e9;
  const isPct = !!(m[3] && /%/.test(m[3])), isPp = !!(m[3] && /pp/i.test(m[3]));
  return { v: isPct ? v / 100 : v, pct: isPct || isPp, pp: isPp };
}
const lowerIsBetter = label => /discount|disc\.|overdue|lost|at risk|days open|refund|below/i.test(String(label || ''));
function changeChip(a, b, label) {
  if (!Number.isFinite(a.v) || !Number.isFinite(b.v)) return '<span class="delta flat">n/a</span>';
  if (!(a.pct || b.pct) && (/gap/i.test(String(label || '')) || a.v * b.v < 0)) { const d = a.v - b.v; return `<span class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d >= 0 ? '+' : '−'}${egpC(Math.abs(d))}</span>`; }
  if (a.pct || b.pct) return ppChip(a.v - b.v, lowerIsBetter(label));
  return deltaChip(chg(a.v, b.v), lowerIsBetter(label));
}
function changeText(a, b) {
  if (!Number.isFinite(a.v) || !Number.isFinite(b.v)) return 'n/a';
  if (!(a.pct || b.pct) && a.v * b.v < 0) { const d = a.v - b.v; return `${d >= 0 ? '+' : '−'}${egpC(Math.abs(d))}`; }
  if (a.pct || b.pct) { const d = (a.v - b.v) * 100; return `${d > 0 ? '+' : ''}${d.toFixed(1)} pp`; }
  const d = chg(a.v, b.v); return Number.isFinite(d) ? `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%` : 'n/a';
}
const fmtBlock = (v, fmt) => (!Number.isFinite(v) ? '—' : fmt === 'pct' ? pct(v) : fmt === 'int' ? fmtInt(v) : compact(v));

function cmpKpis(ba, bb, la, lb) {
  const mapB = new Map((bb ? bb.items : []).map(x => [x.label, x])), sameShape = bb && bb.items.length === ba.items.length;
  const rows = ba.items.map((x, k) => { const y = mapB.get(x.label) || (sameShape ? bb.items[k] : null); const a = parseVal(x.value), b = parseVal(y && y.value); return [esc(x.label), esc(x.value), y ? esc(y.value) : '—', changeChip(a, b, x.label)]; });
  return table(['Figure', esc(la), esc(lb), 'Change'], rows);
}
function cmpBars(ba, bb, la, lb) {
  const fmt = ba.fmt === 'pct' ? 'pct' : 'money';
  const mb = new Map(); if (bb) bb.labels.forEach((l, i) => mb.set(l, bb.values[i]));
  const labels = ba.labels.slice(); if (bb) for (const l of bb.labels) if (!labels.includes(l)) labels.push(l);
  const va = new Map(ba.labels.map((l, i) => [l, ba.values[i]]));
  const rows = labels.map(l => ({ l, a: va.has(l) ? va.get(l) : NaN, b: mb.has(l) ? mb.get(l) : NaN }));
  pushBlock({ type: 'bars', labels: rows.map(r => r.l), values: rows.map(r => (Number.isFinite(r.a) ? r.a : 0)), series2: rows.map(r => (Number.isFinite(r.b) ? r.b : 0)), names: [la, lb], fmt, notes: rows.map(r => [r.l, fmtBlock(r.a, fmt), `${lb}: ${fmtBlock(r.b, fmt)} · ${changeText({ v: r.a, pct: fmt === 'pct' }, { v: r.b, pct: fmt === 'pct' })}`]) });
  const max = Math.max(1e-9, ...rows.flatMap(r => [r.a, r.b]).filter(Number.isFinite).map(Math.abs));
  const bar = (v, color) => `<div class="bar" style="height:9px"><i style="width:${Number.isFinite(v) ? Math.max(0, (Math.abs(v) / max) * 100) : 0}%;background:${color}"></i></div>`;
  const wideL = rows.some(r => String(r.l).length > 20);
  const body = rows.map(r => `<div class="hrow" style="display:grid;grid-template-columns:${wideL ? 'minmax(160px,42%) minmax(80px,1fr) auto' : 'minmax(90px,170px) minmax(0,1fr) auto'};gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-2)"><div style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;${wideL ? 'line-height:1.3' : 'white-space:nowrap'}" title="${esc(r.l)}">${esc(r.l)}</div><div style="display:grid;gap:3px">${bar(r.a, 'var(--blue)')}${bar(r.b, 'var(--grey-l)')}</div><div style="font-size:12px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap"><b>${fmtBlock(r.a, fmt)}</b> <span class="mini">vs ${fmtBlock(r.b, fmt)}</span> ${changeChip({ v: r.a, pct: fmt === 'pct' }, { v: r.b, pct: fmt === 'pct' }, r.l)}</div></div>`).join('');
  return `<div role="list" class="hlist">${body}</div><div class="legend"><span><i class="sw sq" style="background:var(--blue)"></i>${esc(la)}</span><span><i class="sw sq" style="background:var(--grey-l)"></i>${esc(lb)}</span></div>`;
}
function cmpLine(ba, bb, la, lb) {
  const fmt = ba.fmt || 'money';
  const agg = vals => { const f = (vals || []).filter(Number.isFinite); if (!f.length) return NaN; return fmt === 'pct' ? f.reduce((t, v) => t + v, 0) / f.length : f.reduce((t, v) => t + v, 0); };
  const mb = new Map((bb ? bb.multi : []).map(se => [se.name, se]));
  if (ba.multi.length <= 3) {
    const n = Math.max(ba.labels.length, bb ? bb.labels.length : 0);
    const labels = Array.from({ length: n }, (_, i) => (ba.labels[i] || '') + (bb && bb.labels[i] && bb.labels[i] !== ba.labels[i] ? ' / ' + bb.labels[i] : ''));
    const colors = ['var(--blue)', 'var(--c2)', 'var(--c4)'], colorsB = ['var(--grey)', 'var(--c11)', 'var(--c12)'];
    const series = [];
    ba.multi.forEach((se, k) => { series.push({ name: `${se.name} · ${la}`, color: colors[k % 3], values: labels.map((_, i) => se.values[i] ?? null) }); const sb = mb.get(se.name); if (sb) series.push({ name: `${se.name} · ${lb}`, color: colorsB[k % 3], values: labels.map((_, i) => sb.values[i] ?? null) }); });
    const tot = ba.multi.map(se => { const sb = mb.get(se.name); const a = { v: agg(se.values), pct: fmt === 'pct' }, b = { v: sb ? agg(sb.values) : NaN, pct: fmt === 'pct' }; return [esc(se.name), fmtBlock(a.v, fmt), fmtBlock(b.v, fmt), changeChip(a, b, se.name)]; });
    return lineChart({ labels, series, fmt: fmt === 'pct' ? 'pct' : fmt === 'int' ? 'int' : 'money', aria: 'Comparison over time' }) + table([fmt === 'pct' ? 'Average' : 'Total', esc(la), esc(lb), 'Change'], tot);
  }
  const rows = ba.multi.map(se => { const sb = mb.get(se.name); const a = { v: agg(se.values), pct: fmt === 'pct' }, b = { v: sb ? agg(sb.values) : NaN, pct: fmt === 'pct' }; return { name: se.name, a, b }; }).sort((x, y) => (y.a.v || 0) - (x.a.v || 0));
  return cmpBars({ labels: rows.map(r => r.name), values: rows.map(r => r.a.v), fmt: fmt === 'pct' ? 'pct' : 'money' }, { labels: rows.map(r => r.name), values: rows.map(r => r.b.v) }, la, lb);
}
function cmpTable(ba, bb, la, lb) {
  const head = ba.head;
  const rowsA = ba.rows.slice(0, 80), mapB = new Map((bb ? bb.rows : []).map(r => [r[0], r])), sameShape = bb && bb.rows.length === ba.rows.length;
  const partner = (r, k) => mapB.get(r[0]) || (sameShape ? bb.rows[k] : null);
  const numericCol = head.map((_, c) => c > 0 && rowsA.filter(r => Number.isFinite(parseVal(r[c]).v)).length >= Math.max(1, rowsA.length * 0.6));
  const out = rowsA.map((r, k) => { const rb = partner(r, k); const cells = r.map((v, c) => { if (!c || !numericCol[c]) return esc(v); const a = parseVal(v), b = parseVal(rb && rb[c]); return `<b>${esc(v)}</b><div class="mini">${rb ? esc(rb[c]) : '—'} ${changeChip(a, b, head[c])}</div>`; }); if (r._total) cells._cls = 'total'; return cells; });
  const rowsOut = out.map((cells, k) => (rowsA[k]._total ? { cells, _cls: 'total' } : cells));
  const keep = NUM.pending; NUM.pending = [];
  const html = table(head.map(h => esc(h)), rowsOut, { maxH: 520 });
  NUM.pending = keep;
  // export copy: "A (B, change)"
  pushBlock({ type: 'table', head: head.slice(), rows: rowsA.map((r, k) => { const rb = partner(r, k); return r.map((v, c) => (!c || !numericCol[c] ? v : `${v} (${rb ? rb[c] : '—'}, ${changeText(parseVal(v), parseVal(rb && rb[c]))})`)); }) });
  return `<p class="mini">Each figure shows <b>${esc(la)}</b> with <b>${esc(lb)}</b> under it and the change.${ba.rows.length > 80 ? ` First 80 of ${ba.rows.length} rows.` : ''}</p>` + html;
}
function cmpText(ba, bb, la, lb) {
  pushBlock({ type: 'text', items: ba.items.map(x => `${la}: ${x}`).concat((bb ? bb.items : []).map(x => `${lb}: ${x}`)) });
  const list = items => `<ul class="insights">${(items || []).map(x => `<li>${esc(x)}</li>`).join('') || '<li>No notes.</li>'}</ul>`;
  return `<div class="two"><div><h3>${esc(la)}</h3>${list(ba.items)}</div><div><h3>${esc(lb)}</h3>${list(bb && bb.items)}</div></div>`;
}
function cmpItem(ia, ib, la, lb) {
  const parts = [];
  ia.blocks.forEach((ba, k) => {
    const bb = ib ? ib.blocks.find((x, j) => x.type === ba.type && j === k) || ib.blocks.find(x => x.type === ba.type) : null;
    if (ba.type === 'kpis') parts.push(cmpKpis(ba, bb, la, lb));
    else if (ba.type === 'bars') parts.push(cmpBars(ba, bb, la, lb));
    else if (ba.type === 'line') parts.push(cmpLine(ba, bb, la, lb));
    else if (ba.type === 'table') parts.push(cmpTable(ba, bb, la, lb));
    else if (ba.type === 'text') parts.push(cmpText(ba, bb, la, lb));
  });
  return parts.join('<div style="height:12px"></div>');
}
/* the whole comparison for one tab */
function compareView(pid, fa, fb, opts) {
  opts = opts || {};
  const [la, lb] = sideLabels(fa, fb);
  const saved = { page: NUM.page, n: NUM.n, pending: NUM.pending, subs: NUM.subs, items: NUM.items };
  const itemsA = runTab(pid, fa), itemsB = runTab(pid, fb);
  Object.assign(NUM, saved);
  const byB = new Map(itemsB.map(x => [x.id, x])), byTitleB = new Map(itemsB.map(x => [x.title, x]));
  const top = itemsA.filter(x => !x.parent && x.blocks.length);
  const subsOf = id => itemsA.filter(x => x.parent === id && x.blocks.length && !x.kpiSub);
  const tab = PAGES.find(p => p.id === pid);
  let h = `<div class="notice"><b>${esc(tab.name)}:</b> every chart, table and key figure below shows <b style="color:var(--blue)">${esc(la)}</b> against <b>${esc(lb)}</b>, with the change. ${!hasData(fb) ? '<br><b>No transaction data is loaded for side B</b>, so its figures are empty.' : ''}${opts.note || ''}</div>`;
  if (!top.length) return h + '<div class="section empty"><strong>Nothing to compare</strong>This tab has no numbered charts for these filters.</div>';
  for (const ia of top) {
    const ib = byB.get(ia.id) && byB.get(ia.id).title === ia.title ? byB.get(ia.id) : byTitleB.get(ia.title) || byB.get(ia.id);
    if (ia.blocks.length === 1 && ia.blocks[0].type === 'kpis') {
      // key-figure cards become one comparison table
      const body = cmpKpis(ia.blocks[0], ib && ib.blocks[0], la, lb);
      h += sec(`${esc(ia.title)} <span class="mini">· from ${ia.id}</span>`, '', body);
      continue;
    }
    let body = cmpItem(ia, ib, la, lb);
    const subs = subsOf(ia.id);
    if (subs.length) {
      const inner = subs.map(sa => { const sb = itemsB.find(x => x.title === sa.title) || byB.get(sa.id); const keep = NUM.pending; NUM.pending = []; const b = cmpItem(sa, sb, la, lb); NUM.pending = keep; return `<div class="mcard" style="margin:8px 0"><h3 style="margin:0 0 8px">${esc(sa.title.replace(ia.title + ' — ', ''))}</h3>${b}</div>`; }).join('');
      body += `<details class="box"><summary>Detail cards · ${subs.length}</summary>${inner}</details>`;
    }
    h += sec(`${esc(ia.title)} <span class="mini">· from ${ia.id}</span>`, esc(ia.desc || ''), body);
  }
  return h;
}

/* ======================= page: comparison ======================= */
function cxDefaults() {
  const S = A.S; if (!A.cx) A.cx = { tab: 'overview', a: null, b: null };
  const x = A.cx;
  if (x.tab !== 'classic' && !TAB_FN[x.tab]) x.tab = 'overview';
  if (!x.a) x.a = Object.assign({}, filterFor(x.tab === 'classic' ? 'overview' : x.tab));
  if (!x.b) x.b = shiftFilter(x.a, 'ly');
  for (const f of [x.a, x.b]) { if (!f.pay) f.pay = 'all'; if (!f.act) f.act = 'all'; if (!f.branch) f.branch = 'all'; f.noOW = !!A.f.noOW; }
  return x;
}
function cxFilterRow(side, f) {
  const months = []; const S = A.S; for (let m = C.ymOf(S.minDay) - 100; m <= C.ymOf(S.maxDay); m = C.ymAdd(m, 1)) months.push(m);
  const mo = sel => months.map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${ymLbl(m)}${A.coverage.has(m) ? '' : ' (no data)'}</option>`).join('');
  const names = branchNames();
  const color = side === 'a' ? 'var(--blue)' : 'var(--grey)';
  return `<div class="toolbar" style="margin:0 0 10px;border-left:5px solid ${color}"><div class="field" style="min-width:60px;flex:0"><label>Side</label><b style="font-size:18px;color:${color}">${side.toUpperCase()}</b></div>
  <div class="field"><label>From</label><select data-cx="${side}.s">${mo(f.s)}</select></div><div class="field"><label>To</label><select data-cx="${side}.e">${mo(f.e)}</select></div>
  <div class="field wide"><label>Branch</label><select data-cx="${side}.branch"><option value="all">${A.scopeBranches ? 'All assigned branches' : 'All branches'}</option>${names.map(b => `<option ${f.branch === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
  <div class="field"><label>Activity</label><select data-cx="${side}.act">${[['all', 'EM + BS + PDI'], ['EM+BS', 'EM + BS'], ['EM+PDI', 'EM + PDI'], ['EM', 'EM'], ['BS', 'BS'], ['PDI', 'PDI']].map(x => `<option value="${x[0]}" ${f.act === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
  <div class="field"><label>Payer</label><select data-cx="${side}.pay">${[['all', 'Cash + warranty'], ['cash', 'Cash'], ['warranty', 'Warranty']].map(x => `<option value="${x[0]}" ${f.pay === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div></div>`;
}
function pageCompareAll() {
  const x = cxDefaults();
  const tabs = CMP_TABS();
  let h = `<div class="section"><div class="sec-head"><div><h2>Compare any tab</h2><p>Pick a tab, then set side A and side B — any period, branch, activity (EM, BS, EM + BS, EM + BS + PDI, EM + PDI, PDI) and payer (cash, warranty). Every chart, table and key figure of that tab is shown A against B with the change. </p></div></div>
  <div class="toolbar" style="margin:0 0 10px"><div class="field wide"><label for="cx-tab">Tab to compare</label><select id="cx-tab" data-cx="tab">${tabs.map(p => `<option value="${p.id}" ${x.tab === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="classic" ${x.tab === 'classic' ? 'selected' : ''}>Branches side by side, selected months, quarter / half / year (classic)</option></select></div></div>`;
  if (x.tab === 'classic') return h + '</div>' + pageCompare();
  h += cxFilterRow('a', x.a) + cxFilterRow('b', x.b);
  h += `<div class="choices"><span class="mini" style="align-self:center">Set B to:</span><button class="choice" data-act="cxpreset" data-v="prev">Previous period</button><button class="choice" data-act="cxpreset" data-v="ly">Same period last year</button><button class="choice" data-act="cxpreset" data-v="same">Same as A (then change one thing)</button><button class="choice" data-act="cxpreset" data-v="swap">Swap A and B</button></div></div>`;
  const fa = Object.assign({}, x.a), fb = Object.assign({}, x.b);
  if (fa.s > fa.e || fb.s > fb.e) return h + '<div class="section empty"><strong>Check the dates</strong>On each side the From month must not come after the To month.</div>';
  return h + compareView(x.tab, fa, fb);
}

/* ======================= page: operations — search & analysis ======================= */
/* An "operation" is a job description on the invoice. Every invoice line belongs to one, so
   operation revenue adds up to total revenue. Search accepts Arabic or English: words must all
   appear (AND), a|b means either, -word leaves it out. */
function opState() { if (!A.op) A.op = { q: '', group: -1, months: new Set(), showAll: false }; return A.op; }
function opMatcher(S, q, group) {
  const terms = String(q || '').trim().split(/\s+/).filter(Boolean).map(t => ({ neg: t.startsWith('-') && t.length > 1, alts: (t.startsWith('-') ? t.slice(1) : t).split('|').map(C.normOp).filter(Boolean) })).filter(t => t.alts.length);
  if (!terms.length && group < 0) return null;
  const nJ = S.opJobs.length, m = new Uint8Array(nJ);
  for (let j = 0; j < nJ; j++) {
    if (group >= 0 && S.opGroup[j] !== group) continue;
    const t = S.opNorm[j]; let ok = true;
    for (const x of terms) { const hit = x.alts.some(a => t.includes(a)); if (x.neg ? hit : !hit) { ok = false; break; } }
    if (ok) m[j] = 1;
  }
  return m;
}
function selMask(S, f) { const idx = C.select(S, f), m = new Uint8Array(S.n); for (let k = 0; k < idx.length; k++) m[idx[k]] = 1; return m; }
function opRows(S, f, jm) {
  const key = JSON.stringify([f.s, f.e, f.branches ? [...f.branches] : null, f.act, f.cw, f.noOW]); S._opSel = S._opSel || new Map();
  let sm = S._opSel.get(key); if (!sm) { sm = selMask(S, f); if (S._opSel.size > 12) S._opSel.clear(); S._opSel.set(key, sm); }
  const O = S.O, ROW = O.row, JOB = O.job, out = []; for (let i = 0; i < O.n; i++) if (sm[ROW[i]] && (!jm || jm[JOB[i]])) out.push(i); return out;
}
function opSum(S, L) {
  const O = S.O; let net = 0, lab = 0, par = 0, hrs = 0, nr = 0, nv = 0, ne = 0;
  // stamp arrays are reused between calls (no per-call allocation)
  const K = S._opK || (S._opK = { st: 0, mr: new Uint32Array(S.roKeys.length), mv: new Uint32Array(S.vins.length), me: new Uint32Array(S.roKeys.length) });
  const st = ++K.st, mr = K.mr, mv = K.mv, me = K.me, ROW = O.row, RO = S.ro, VIN = S.vin, ACT = S.act;
  for (let k = 0, n = L.length; k < n; k++) { const i = L[k], r = ROW[i]; net += O.net[i]; lab += O.netL[i]; par += O.netP[i]; hrs += O.hrs[i]; const ro = RO[r]; if (mr[ro] !== st) { mr[ro] = st; nr++; } const v = VIN[r]; if (v >= 0 && mv[v] !== st) { mv[v] = st; nv++; } if (ACT[r] !== 2 && me[ro] !== st) { me[ro] = st; ne++; } }
  return { net, lab, par, other: net - lab - par, hrs, ros: nr, vins: nv, entries: ne, ticket: nr ? net / nr : NaN };
}
function opGroupBy(S, L, keyFn) { const m = new Map(); for (const i of L) { const k = keyFn(i); let a = m.get(k); if (!a) { a = []; m.set(k, a); } a.push(i); } return m; }
function pageOps() {
  const S = A.S, st = opState();
  if (!S.O || !S.O.n || !S.opsLoaded) return `<div class="section empty"><strong>Re-import the DSR files to search operations</strong>Operation search needs every job description, which is saved by the new importer. Open <b>Data &amp; imports</b> and upload the DSR achieved folder again (the old files are replaced, nothing else changes).${S.O && S.O.n ? '' : ''}</div>`;
  const f = F(), fly = shiftFilter(A.f, 'ly'), Fly = F({ s: fly.s, e: fly.e });
  const groups = S.opGroups;
  const jm = opMatcher(S, st.q, st.group);
  const active = !!jm;
  const chips = `<div class="choices">${groups.map((g, k) => `<button class="choice ${st.group === k ? 'on' : ''}" data-act="opgroup" data-v="${k}">${esc(g)}</button>`).join('')}${active ? '<button class="btn small secondary" data-act="opclear">Clear search</button>' : ''}</div>`;
  let h = `<div class="section"><div class="sec-head"><div><h2>Search operations</h2><p>Type an operation in Arabic or English — for example <b>تكييف</b>, <b>brake|فرامل</b>, <b>60k</b>, <b>كشف -صيانه</b>. All words must appear; <b>a|b</b> means either; <b>-word</b> leaves it out. Pick a group to narrow it. The period, branch, activity and payer filters above apply.</p></div></div>
  <div class="toolbar" style="margin:0 0 10px"><div class="field wide" style="flex:4"><label for="op-q">Operation</label><input id="op-q" class="inp" data-op="q" value="${esc(st.q)}" placeholder="e.g. تكييف, brake, 60k periodic" autocomplete="off" enterkeyhint="search"></div><button class="btn yellow" data-act="opsearch">Search</button></div>${chips}</div>`;
  h += opEditor(S);
  if (!active) return h + opsOverview(S, f, Fly);
  // ---------- results ----------
  const L = opRows(S, f, jm), Lly = opRows(S, Fly, jm), tot = opSum(S, L), ly = opSum(S, Lly);
  const all = opSum(S, opRows(S, f, null));
  const label = [st.group >= 0 ? groups[st.group] : '', st.q ? `“${st.q}”` : ''].filter(Boolean).join(' · ');
  if (!L.length) h += `<div class="notice">No operation matches <b>${esc(label)}</b> in ${periodText(A.f)} with these filters.${Lly.length ? ` It had ${fmtInt(ly.ros)} ROs in the same period last year.` : ''}</div>`;
  h += cards([
    { label: 'Revenue', value: egpC(tot.net), note: `${pct(all.net ? tot.net / all.net : NaN)} of all revenue · last year ${egpC(ly.net)} ${deltaChip(chg(tot.net, ly.net))}` },
    { label: 'Repair orders', value: fmtInt(tot.ros), count: true, note: `last year ${fmtInt(ly.ros)} ${deltaChip(chg(tot.ros, ly.ros))}`, t: 't-blue' },
    { label: 'Vehicles', value: fmtInt(tot.vins), count: true, note: `${fmtInt(tot.entries)} car entries (no PDI)`, t: 't-mag' },
    { label: 'Revenue per RO', value: egpC(tot.ticket), note: `last year ${egpC(ly.ticket)} ${deltaChip(chg(tot.ticket, ly.ticket))}`, t: 't-dark' },
    { label: 'Labour', value: egpC(tot.lab), note: `${pct(tot.net ? tot.lab / tot.net : NaN)} · ${fmtInt(tot.hrs)} billed hours`, t: 't-amber' },
    { label: 'Parts', value: egpC(tot.par), note: `${pct(tot.net ? tot.par / tot.net : NaN)} of this operation`, t: 't-blue' },
    { label: 'Labour per billed hour', value: egpC(tot.hrs ? tot.lab / tot.hrs : NaN), note: 'Labour revenue ÷ hours', t: 't-mag' },
    { label: 'Matching job descriptions', value: fmtInt(new Set(L.map(i => S.O.job[i])).size), count: true, note: 'Different wordings found', t: 't-dark' },
  ], `Operation: ${label}`);
  // monthly trend over every loaded month (same branch / activity / payer)
  const ms = monthOptions();
  const fAll = F({ s: ms[0], e: ms[ms.length - 1] });
  const Lall = opRows(S, fAll, jm), byM = opGroupBy(S, Lall, i => S.ym[S.O.row[i]]);
  const mSum = new Map(ms.map(m => [m, byM.has(m) ? opSum(S, byM.get(m)) : null]));
  const shownM = ms.slice(-24);
  h += sec(`Revenue and repair orders by month — ${esc(label)}`, 'Every month loaded (last 24 shown), with the same month a year earlier. The branch, activity and payer filters apply; the period filter does not.', lineChart({ labels: shownM.map(ymLbl), series: [{ name: 'Revenue', color: 'var(--blue)', values: shownM.map(m => (mSum.get(m) ? mSum.get(m).net : null)) }, { name: 'Same month last year', color: 'var(--grey-l)', values: shownM.map(m => (mSum.get(m - 100) ? mSum.get(m - 100).net : null)) }], missing: shownM.map(m => !A.coverage.has(m)), fmt: 'money', aria: 'Operation by month' }) + lineChart({ labels: shownM.map(ymLbl), series: [{ name: 'Repair orders', color: 'var(--c2)', values: shownM.map(m => (mSum.get(m) ? mSum.get(m).ros : null)) }, { name: 'Same month last year', color: 'var(--grey-l)', values: shownM.map(m => (mSum.get(m - 100) ? mSum.get(m - 100).ros : null)) }], fmt: 'int', aria: 'Operation ROs by month' }));
  // compare chosen months
  if (!st.months.size) { const last = ms[ms.length - 1]; [last, C.ymAdd(last, -1), last - 100].forEach(m => { if (ms.includes(m)) st.months.add(m); }); }
  const pick = `<div class="choices">${ms.map(m => `<label class="choice ${st.months.has(m) ? 'on' : ''}"><input type="checkbox" data-act="opmonth" value="${m}" ${st.months.has(m) ? 'checked' : ''}>${ymLbl(m)}</label>`).join('')}</div>`;
  const chosen = [...st.months].filter(m => ms.includes(m)).sort((a, b) => a - b);
  const base = chosen.length ? mSum.get(chosen[0]) : null;
  h += sec('Compare months', 'Tick the months to compare. Change is against the first ticked month.', pick + table(['Month', 'Revenue', 'Repair orders', 'Vehicles', 'Revenue per RO', 'Labour', 'Parts', 'Change in revenue'], chosen.map(m => { const x = mSum.get(m) || { net: 0, ros: 0, vins: 0, ticket: NaN, lab: 0, par: 0 }; return [ymLbl(m), egp(x.net), fmtInt(x.ros), fmtInt(x.vins), egp(x.ticket), egp(x.lab), egp(x.par), base && m !== chosen[0] ? deltaChip(chg(x.net, base.net)) : '—']; })));
  // models, branches, advisors
  const top = (keyFn, nameFn, n) => [...opGroupBy(S, L, keyFn)].map(([k, l]) => ({ k, name: nameFn(k), s: opSum(S, l) })).sort((a, b) => b.s.net - a.s.net).slice(0, n);
  const lyBy = (keyFn) => { const m = new Map(); for (const [k, l] of opGroupBy(S, Lly, keyFn)) m.set(k, opSum(S, l)); return m; };
  const mods = top(i => S.model[S.O.row[i]], k => S.models[k], 12), modLy = lyBy(i => S.model[S.O.row[i]]);
  const brs = top(i => S.br[S.O.row[i]], k => S.branches[k], 15), brLy = lyBy(i => S.br[S.O.row[i]]);
  h += `<div class="two">${sec('Top models for this operation', 'Revenue, with repair orders and change against the same period last year.', hbars(mods.map(x => ({ label: x.name, segs: [{ v: x.s.net, color: 'var(--blue)' }], value: `<b>${egpC(x.s.net)}</b>`, sub: `${fmtInt(x.s.ros)} ROs · ${egpC(x.s.ticket)} per RO · ${modLy.get(x.k) ? 'vs LY ' + txtDelta(chg(x.s.net, modLy.get(x.k).net)) : 'new vs LY'}` })), { aria: 'Top models' }))}${sec('By branch', '', hbars(brs.map(x => ({ label: x.name, segs: [{ v: x.s.net, color: branchColor(x.name) }], value: `<b>${egpC(x.s.net)}</b>`, sub: `${fmtInt(x.s.ros)} ROs · ${egpC(x.s.ticket)} per RO · ${brLy.get(x.k) ? 'vs LY ' + txtDelta(chg(x.s.net, brLy.get(x.k).net)) : 'new vs LY'}` })), { aria: 'Operation by branch' }))}</div>`;
  const advs = top(i => S.adv[S.O.row[i]], k => S.advs[k], 12);
  h += sec('Service advisors selling this operation', '', hbars(advs.map(x => ({ label: x.name, segs: [{ v: x.s.net, color: 'var(--c2)' }], value: `<b>${egpC(x.s.net)}</b>`, sub: `${fmtInt(x.s.ros)} ROs · ${egpC(x.s.ticket)} per RO` })), { aria: 'Operation by advisor' }));
  // km milestones (maintenance)
  const kmM = opGroupBy(S, L.filter(i => S.opKm[S.O.job[i]] > 0), i => S.opKm[S.O.job[i]]), kmLy = lyBy(i => S.opKm[S.O.job[i]]);
  if (kmM.size >= 2) h += sec('By maintenance milestone (km)', 'From the km in the job description. New models follow the 8,000 km schedule (8K, 16K, 24K…); older ones the 10,000 km schedule.', table(['Milestone', 'Revenue', 'Repair orders', 'Revenue per RO', 'Last year revenue', 'Change', 'Top model'], [...kmM].sort((a, b) => a[0] - b[0]).map(([km, l]) => { const s2 = opSum(S, l), y = kmLy.get(km); const tm = [...opGroupBy(S, l, i => S.model[S.O.row[i]])].map(([k, ll]) => [k, ll.reduce((t, i) => t + S.O.net[i], 0)]).sort((a, b) => b[1] - a[1])[0]; return [fmtInt(km / 1000) + 'K', egp(s2.net), fmtInt(s2.ros), egp(s2.ticket), y ? egp(y.net) : '—', y ? deltaChip(chg(s2.net, y.net)) : '<span class="tag blue">new</span>', tm ? esc(S.models[tm[0]]) : '']; }), { maxH: 520 }));
  // wordings
  const jobsL = [...opGroupBy(S, L, i => S.O.job[i])].map(([j, l]) => ({ j, s: opSum(S, l) })).sort((a, b) => b.s.net - a.s.net);
  const shownJ = st.showAll ? jobsL.slice(0, 400) : jobsL.slice(0, 40);
  const admin = isAdmin();
  // ticked wordings (kept by name, so a redraw keeps them); the actions apply to the ticked ones, or to all when none is ticked
  if (!A.opSel) A.opSel = new Set();
  for (const n of [...A.opSel]) if (!jobsL.some(x => S.opJobs[x.j] === n)) A.opSel.delete(n);
  const selInfo = () => (A.opSel.size ? `the <b>${fmtInt(A.opSel.size)}</b> ticked wording${A.opSel.size > 1 ? 's' : ''}` : `all <b>${fmtInt(jobsL.length)}</b> wordings (tick some to move only those)`);
  const bulk = admin && jobsL.length ? `<p class="mini" style="margin:0 0 6px">Applies to <span class="op-selinfo">${selInfo()}</span>.${A.opSel.size ? ' <button class="btn small secondary" data-act="opselclear">Untick all</button>' : ''}</p><div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field wide"><label for="op-mergename">Move to another operation (type its name, or a new standard name)</label><input id="op-mergename" class="inp" dir="auto" placeholder="e.g. A/C service" list="op-names"></div><button class="btn" data-act="opmergeall">Move</button><div class="field"><label for="op-groupall">Move to group</label><select id="op-groupall" class="inp"><option value="">Choose…</option>${groups.map(g => `<option>${esc(g)}</option>`).join('')}<option value="__rule">Back to the rules</option></select></div><button class="btn secondary" data-act="opgroupall">Apply</button></div><datalist id="op-names">${[...new Set(Object.values(A.cfg.opAlias || {}).concat(jobsL.slice(0, 200).map(x => S.opJobs[x.j])))].slice(0, 500).map(n => `<option value="${esc(n)}">`).join('')}</datalist>` : '';
  A._opMatched = jobsL.map(x => x.j);
  h += sec(`Matching job descriptions — ${fmtInt(jobsL.length)}`, `How the operation is written on the invoices. Leave a wording out with -word in the search.${admin ? ' Use <b>Edit</b> to change a wording’s group or give it a standard name; merged wordings then count as one operation everywhere.' : ''}`, bulk + table((admin ? [`<input type="checkbox" data-opselall="1" aria-label="Tick all shown" ${shownJ.length && shownJ.every(x => A.opSel.has(S.opJobs[x.j])) ? 'checked' : ''}>`] : []).concat(['Job description', 'Group', 'Revenue', 'Repair orders', 'Revenue per RO']).concat(admin ? [''] : []), shownJ.map(x => (admin ? [`<input type="checkbox" data-opsel="${esc(S.opJobs[x.j])}" ${A.opSel.has(S.opJobs[x.j]) ? 'checked' : ''} aria-label="Tick">`] : []).concat([`<span dir="auto">${esc(S.opJobs[x.j])}</span>${S.opMembers[x.j].length ? `<div class="mini">${fmtInt(S.opMembers[x.j].length)} merged wording${S.opMembers[x.j].length > 1 ? 's' : ''}</div>` : ''}`, esc(groups[S.opGroup[x.j]]) + ((A.cfg.opOverride || {})[S.opJobs[x.j]] ? ' <span class="tag">set by hand</span>' : ''), egp(x.s.net), fmtInt(x.s.ros), egp(x.s.ticket)]).concat(admin ? [`<button class="btn small secondary" data-act="opedit" data-v="${esc(S.opJobs[x.j])}">Edit</button>`] : [])), { maxH: 560, align: (admin ? [''] : []).concat(['', '', 'num', 'num', 'num']).concat(admin ? ['num'] : []) }) + (jobsL.length > 40 ? `<div style="margin-top:8px"><button class="btn small secondary" data-act="opall">${st.showAll ? 'Show top 40' : `Show up to ${Math.min(400, jobsL.length)}`}</button></div>` : ''));
  return h;
}
const txtDelta = d => (Number.isFinite(d) ? `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}%` : 'n/a');
function opsOverview(S, f, Fly) {
  const groups = S.opGroups;
  const L = opRows(S, f, null), Lly = opRows(S, Fly, null);
  const byG = opGroupBy(S, L, i => S.opGroup[S.O.job[i]]), byGly = opGroupBy(S, Lly, i => S.opGroup[S.O.job[i]]);
  const all = opSum(S, L);
  const rows = groups.map((g, k) => ({ k, g, s: byG.has(k) ? opSum(S, byG.get(k)) : null, y: byGly.has(k) ? opSum(S, byGly.get(k)) : null })).filter(x => x.s);
  rows.sort((a, b) => b.s.net - a.s.net);
  let h = sec('Operation groups', `Revenue of each group in ${periodText(A.f)}, with the change against the same period last year. Click a group above to open it. Groups come from the job description; edit them at the bottom of this tab.`, hbars(rows.map(x => ({ label: x.g, segs: [{ v: x.s.net, color: 'var(--blue)' }], value: `<b>${egpC(x.s.net)}</b>`, sub: `${pct(all.net ? x.s.net / all.net : NaN)} · ${fmtInt(x.s.ros)} ROs · ${egpC(x.s.ticket)} per RO · vs LY ${x.y ? txtDelta(chg(x.s.net, x.y.net)) : 'n/a'}` })), { aria: 'Operation groups' }));
  // rising and falling groups
  const mv = rows.filter(x => x.y && x.y.net > 0).map(x => ({ g: x.g, d: x.s.net - x.y.net, p: chg(x.s.net, x.y.net), tk: chg(x.s.ticket, x.y.ticket), ro: chg(x.s.ros, x.y.ros) })).sort((a, b) => b.d - a.d);
  if (mv.length) {
    const ins = [];
    const up = mv.filter(x => x.d > 0).slice(0, 3), dn = mv.filter(x => x.d < 0).slice(-3).reverse();
    if (up.length) ins.push(`Growing most: ${up.map(x => `${x.g} ${egpC(x.d)} (${txtDelta(x.p)}; ROs ${txtDelta(x.ro)}, ticket ${txtDelta(x.tk)})`).join('; ')}.`);
    if (dn.length) ins.push(`Falling most: ${dn.map(x => `${x.g} ${egpC(x.d)} (${txtDelta(x.p)}; ROs ${txtDelta(x.ro)}, ticket ${txtDelta(x.tk)})`).join('; ')}.`);
    h += sec('What moved against last year', '', `<ul class="insights">${ins.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
  }
  // top operations with YoY
  const byJ = opGroupBy(S, L, i => S.O.job[i]), byJly = opGroupBy(S, Lly, i => S.O.job[i]);
  const tj = [...byJ].map(([j, l]) => ({ j, s: opSum(S, l), y: byJly.has(j) ? opSum(S, byJly.get(j)) : null, l })).sort((a, b) => b.s.net - a.s.net).slice(0, 30);
  const adm = isAdmin();
  h += sec('Top 30 operations', `Click a wording to search for it.${adm ? ' Edit changes its group or gives it a standard name.' : ''}`, table(['Operation', 'Group', 'Revenue', 'ROs', 'Revenue per RO', 'Last year', 'Change', 'Top model'].concat(adm ? [''] : []), tj.map(x => { const tm = [...opGroupBy(S, x.l, i => S.model[S.O.row[i]])].map(([k, ll]) => [k, ll.reduce((t, i) => t + S.O.net[i], 0)]).sort((a, b) => b[1] - a[1])[0]; return [`<button class="btn small secondary" style="text-align:start;white-space:normal" data-act="opfind" data-v="${esc(S.opJobs[x.j])}" dir="auto">${esc(S.opJobs[x.j])}</button>`, esc(groups[S.opGroup[x.j]]), egp(x.s.net), fmtInt(x.s.ros), egp(x.s.ticket), x.y ? egp(x.y.net) : '—', x.y ? deltaChip(chg(x.s.net, x.y.net)) : '<span class="tag blue">new</span>', tm ? esc(S.models[tm[0]]) : ''].concat(adm ? [`<button class="btn small secondary" data-act="opedit" data-v="${esc(S.opJobs[x.j])}">Edit</button>`] : []); }), { maxH: 640 }));
  // maintenance milestones overview
  const per = groups.indexOf('Periodic maintenance');
  if (per >= 0) {
    const kmL = L.filter(i => S.opGroup[S.O.job[i]] === per && S.opKm[S.O.job[i]] > 0), kmLy = Lly.filter(i => S.opGroup[S.O.job[i]] === per && S.opKm[S.O.job[i]] > 0);
    const a = opGroupBy(S, kmL, i => S.opKm[S.O.job[i]]), b = opGroupBy(S, kmLy, i => S.opKm[S.O.job[i]]);
    const sched = km => (km % 8000 === 0 && km % 10000 !== 0 ? '8,000 km' : km % 10000 === 0 && km % 8000 !== 0 ? '10,000 km' : km < 2000 ? 'First service' : 'Both');
    const bySched = new Map(); for (const [km, l] of a) { const k = sched(km); const o = bySched.get(k) || { now: 0, ly: 0, ros: 0, rosLy: 0 }; const s2 = opSum(S, l); o.now += s2.net; o.ros += s2.ros; bySched.set(k, o); }
    for (const [km, l] of b) { const k = sched(km); const o = bySched.get(k) || { now: 0, ly: 0, ros: 0, rosLy: 0 }; const s2 = opSum(S, l); o.ly += s2.net; o.rosLy += s2.ros; bySched.set(k, o); }
    if (a.size) h += sec('Maintenance by schedule and milestone', 'The 8,000 km schedule (8K, 16K, 24K…) belongs to the newer models; the 10,000 km schedule (10K, 20K, 30K…) to the older ones. Milestones such as 40K or 80K fit both.', table(['Schedule', 'Revenue', 'Last year', 'Change', 'ROs', 'ROs last year', 'Change'], [...bySched].map(([k, o]) => [k, egp(o.now), egp(o.ly), deltaChip(chg(o.now, o.ly)), fmtInt(o.ros), fmtInt(o.rosLy), deltaChip(chg(o.ros, o.rosLy))])) +
      table(['Milestone', 'Revenue', 'ROs', 'Revenue per RO', 'Last year ROs', 'Change in ROs'], [...a].sort((x, y) => x[0] - y[0]).map(([km, l]) => { const s2 = opSum(S, l), y = b.has(km) ? opSum(S, b.get(km)) : null; return [fmtInt(km / 1000) + 'K', egp(s2.net), fmtInt(s2.ros), egp(s2.ticket), y ? fmtInt(y.ros) : '—', y ? deltaChip(chg(s2.ros, y.ros)) : '<span class="tag blue">new</span>']; }), { maxH: 480 }));
    // extra work on maintenance visits (ignoring routine add-ons)
    const routine = C.safeRe(A.cfg.opRoutine || '');
    const roPer = new Map(); // ro -> {br, adv, extra}
    for (const i of L) { const r = S.O.row[i]; if (S.act[r] === 2) continue; const j = S.O.job[i], ro = S.ro[r]; let o = roPer.get(ro); if (!o) { o = { per: false, extra: 0, br: S.br[r], adv: S.adv[r] }; roPer.set(ro, o); } if (S.opGroup[j] === per) o.per = true; else if (S.O.net[i] > 0 && !(routine && routine.test(S.opNorm[j]))) o.extra += S.O.net[i]; }
    const pv = [...roPer.values()].filter(o => o.per);
    if (pv.length) {
      const agg = keyFn => { const m = new Map(); for (const o of pv) { const k = keyFn(o); const x = m.get(k) || { n: 0, up: 0, rev: 0 }; x.n++; if (o.extra > 0) { x.up++; x.rev += o.extra; } m.set(k, x); } return m; };
      const net0 = agg(() => 0).get(0);
      const brA = [...agg(o => o.br)].map(([k, x]) => ({ name: S.branches[k], ...x })).filter(x => x.n >= 20).sort((a, b) => b.up / b.n - a.up / a.n);
      const advA = [...agg(o => o.adv)].map(([k, x]) => ({ name: S.advs[k], ...x })).filter(x => x.n >= 50).sort((a, b) => b.up / b.n - a.up / a.n);
      h += sec('Extra work sold on maintenance visits', `Maintenance repair orders that also billed another (non-routine) operation. Network: ${pct(net0.up / net0.n)} of ${fmtInt(net0.n)} maintenance ROs, worth ${egpC(net0.rev)} of extra work. Routine add-ons recorded on every visit (lights check, electric service…) are not counted — the list is in the settings below.`, `<div class="two"><div>${hbars(brA.map(x => ({ label: x.name, segs: [{ v: x.up / x.n, color: branchColor(x.name) }], value: `<b>${pct(x.up / x.n)}</b>`, sub: `${fmtInt(x.up)} of ${fmtInt(x.n)} · ${egpC(x.rev)}` })), { max: 1, aria: 'Extra work by branch' })}</div><div>${hbars(advA.slice(0, 8).concat(advA.length > 16 ? advA.slice(-8) : advA.slice(8)).map(x => ({ label: x.name, segs: [{ v: x.up / x.n, color: 'var(--c2)' }], value: `<b>${pct(x.up / x.n)}</b>`, sub: `${fmtInt(x.up)} of ${fmtInt(x.n)} maintenance ROs` })), { max: 1, aria: 'Extra work by advisor' })}<p class="mini">Advisors with 50+ maintenance ROs: highest 8 and lowest 8.</p></div></div>`);
    }
  }
  // diagnosis conversion
  const dg = groups.indexOf('Diagnosis / check (general)');
  if (dg >= 0) {
    const roD = new Map(); for (const i of L) { const r = S.O.row[i], ro = S.ro[r]; let o = roD.get(ro); if (!o) { o = { d: false, par: 0, net: 0, br: S.br[r] }; roD.set(ro, o); } if (S.opGroup[S.O.job[i]] === dg) o.d = true; o.par += S.O.netP[i]; o.net += S.O.net[i]; }
    const dv = [...roD.values()].filter(o => o.d);
    if (dv.length >= 20) { const conv = dv.filter(o => o.par > 0); const by = new Map(); for (const o of dv) { const x = by.get(o.br) || { n: 0, c: 0, rev: 0 }; x.n++; if (o.par > 0) x.c++; x.rev += o.net; by.set(o.br, x); } h += sec('Diagnosis visits turned into repairs', `Repair orders with a general check / diagnosis operation that also billed parts: ${pct(conv.length / dv.length)} of ${fmtInt(dv.length)}, average ticket ${egpC(dv.reduce((t, o) => t + o.net, 0) / dv.length)}.`, hbars([...by].sort((p1, p2) => p2[1].c / p2[1].n - p1[1].c / p1[1].n).map(([k, x]) => ({ label: S.branches[k], segs: [{ v: x.c / x.n, color: branchColor(S.branches[k]) }], value: `<b>${pct(x.c / x.n)}</b>`, sub: `${fmtInt(x.c)} of ${fmtInt(x.n)} · ${egpC(x.rev / x.n)} per RO` })), { max: 1, aria: 'Diagnosis conversion' })); }
  }
  h += opSettings();
  return h;
}
function opEditor(S) {
  const t = A.opEdit; if (!t || !isAdmin()) return '';
  const j = S.opJobs.indexOf(t); if (j < 0) { A.opEdit = null; return ''; }
  const groups = S.opGroups, ov = (A.cfg.opOverride || {})[t], mem = S.opMembers[j];
  return `<div class="section" style="border:2px solid var(--yellow)"><div class="sec-head"><div><h2>Edit operation</h2><p dir="auto"><b>${esc(t)}</b>${mem.length ? ` — includes ${fmtInt(mem.length)} merged wording${mem.length > 1 ? 's' : ''}` : ''}. Changes apply to all saved data for everyone.</p></div><button class="btn small secondary" data-act="opeditcancel">Close</button></div>
  <div class="toolbar" style="margin:0 0 12px;align-items:flex-end"><div class="field wide"><label for="ope-name">Standard name (type an existing name to merge into it)</label><input id="ope-name" class="inp" dir="auto" value="${esc(t)}" list="op-names2"></div><div class="field"><label for="ope-group">Group</label><select id="ope-group" class="inp"><option value="">By the rules (now: ${esc(groups[S.opGroup[j]])})</option>${groups.map(g => `<option ${ov === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></div><button class="btn yellow" data-act="opeditsave">Save</button></div>
  <datalist id="op-names2">${[...new Set(Object.values(A.cfg.opAlias || {}))].slice(0, 300).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
  ${mem.length ? table(['Merged wording', ''], mem.slice(0, 200).map(m => [`<span dir="auto">${esc(m)}</span>`, `<button class="btn small secondary" data-act="opunmerge" data-v="${esc(m)}">Take out</button>`]), { align: ['', 'num'], maxH: 300 }) : ''}</div>`;
}
function opSettings() {
  const admin = isAdmin(), list = A.cfg.opGroups && A.cfg.opGroups.length ? A.cfg.opGroups : C.DEFAULT_OP_GROUPS();
  const rows = list.map((g, k) => `<tr><td><input class="inp" data-og="${k}.name" value="${esc(g.name)}" ${admin ? '' : 'disabled'}></td><td><input class="inp" dir="auto" data-og="${k}.pattern" value="${esc(g.pattern)}" ${admin ? '' : 'disabled'}></td><td class="num">${admin ? `<button class="btn small secondary" data-act="ogup" data-i="${k}" ${k ? '' : 'disabled'}>↑</button> <button class="btn small secondary" data-act="ogdel" data-i="${k}">Remove</button>` : ''}</td></tr>`).join('');
  return `<details class="box"><summary>Operation groups and routine add-ons — settings</summary><p class="mini">Each group is a list of words separated by | (Arabic or English, lower case). Groups are checked from the top and the first match wins; anything left is “Other”.</p><div class="scroll"><table class="table"><thead><tr><th>Group</th><th>Words in the job description</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="field" style="margin:12px 0"><label for="op-rt">Routine add-ons not counted as extra work</label><input id="op-rt" class="inp" dir="auto" data-og="routine" value="${esc(A.cfg.opRoutine || '')}" ${admin ? '' : 'disabled'}></div>
  ${admin ? '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="ogsave">Apply</button><button class="btn secondary" data-act="ogadd">Add group</button><button class="btn secondary" data-act="ogreset">Back to the standard groups</button></div>' : ''}
  ${(() => { const al = Object.entries(A.cfg.opAlias || {}), og = Object.entries(A.cfg.opOverride || {}); let x = ''; if (al.length) x += `<h3>Wordings with a standard name · ${fmtInt(al.length)}</h3>` + table(['Wording on the invoice', 'Counted as', ''], al.slice(0, 500).map(([raw, n]) => [`<span dir="auto">${esc(raw)}</span>`, `<span dir="auto">${esc(n)}</span>`, admin ? `<button class="btn small secondary" data-act="opunmerge" data-v="${esc(raw)}">Undo</button>` : '']), { align: ['', '', 'num'], maxH: 320 }); if (og.length) x += `<h3>Operations moved to a group by hand · ${fmtInt(og.length)}</h3>` + table(['Operation', 'Group', ''], og.slice(0, 500).map(([n, g]) => [`<span dir="auto">${esc(n)}</span>`, esc(g), admin ? `<button class="btn small secondary" data-act="opungroup" data-v="${esc(n)}">Back to rules</button>` : '']), { align: ['', '', 'num'], maxH: 320 }); return x; })()}</details>`;
}

/* ======================= extra insights (overview, models, PDI & retention, labour, trends) ======================= */
/* what drove revenue against the same period last year: vehicles × visits per vehicle × revenue per visit.
   The three effects use log shares, so they add up exactly to the change in revenue. */
function growthDrivers(cur, prevY) {
  const a = cur.sm, b = prevY.sm;
  if (!(b.rev > 0 && a.rev > 0 && a.vins && b.vins && a.ros && b.ros)) return '';
  const f = [
    { name: 'Vehicles (VTP)', now: a.vins, ly: b.vins, fmt: fmtInt },
    { name: 'Repair orders per vehicle', now: a.ros / a.vins, ly: b.ros / b.vins, fmt: v => v.toFixed(2) },
    { name: 'Revenue per repair order', now: a.rev / a.ros, ly: b.rev / b.ros, fmt: v => egp(v) },
  ];
  const dRev = a.rev - b.rev, lnR = Math.log(a.rev / b.rev);
  f.forEach(x => { x.eff = Math.abs(lnR) > 1e-9 ? (Math.log(x.now / x.ly) / lnR) * dRev : 0; });
  const rows = f.map(x => [x.name, x.fmt(x.now), x.fmt(x.ly), deltaChip(chg(x.now, x.ly)), `<b class="ach ${x.eff >= 0 ? 'on' : 'below'}">${x.eff >= 0 ? '+' : '−'}${egpC(Math.abs(x.eff)).replace('EGP ', 'EGP ')}</b>`]);
  rows.push({ cells: ['Revenue', egp(a.rev), egp(b.rev), deltaChip(chg(a.rev, b.rev)), `<b>${dRev >= 0 ? '+' : '−'}${egpC(Math.abs(dRev))}</b>`], _cls: 'total' });
  const main = f.slice().sort((x, y) => Math.abs(y.eff) - Math.abs(x.eff))[0];
  const note = `${dRev >= 0 ? 'Revenue rose' : 'Revenue fell'} ${egpC(Math.abs(dRev))} (${txtDelta(chg(a.rev, b.rev))}); the biggest part came from ${main.name.toLowerCase()} (${txtDelta(chg(main.now, main.ly))}).${f[0].now < f[0].ly && dRev > 0 ? ' Fewer vehicles came in, so the growth is from spending per visit — a retention / call-back push would add volume on top.' : ''}`;
  return sec('What drove revenue against last year', `${note} Same months a year earlier, same branch / activity / payer.`, table(['Driver', 'This period', 'Last year', 'Change', 'Effect on revenue'], rows));
}

/* models whose serviced fleet is growing or shrinking */
function modelShift(cur) {
  const S = A.S, f = shiftFilter(A.f, 'ly');
  const ly = stats(f.s, f.e);
  if (!ly.sm.lines) return '';
  const a = C.groupBy(S, cur.idx, i => S.model[i]), b = C.groupBy(S, ly.idx, i => S.model[i]);
  const keys = new Set([...a.keys(), ...b.keys()]);
  const rows = [...keys].map(k => { const x = a.has(k) ? C.summarize(S, a.get(k)) : null, y = b.has(k) ? C.summarize(S, b.get(k)) : null; return { name: S.models[k], x, y, v1: x ? x.vins : 0, v0: y ? y.vins : 0, r1: x ? x.rev : 0, r0: y ? y.rev : 0 }; })
    .filter(r => Math.max(r.v1, r.v0) >= 30 && !/^\(No model\)$|^PDI$|^Others$/i.test(r.name));
  const rising = rows.filter(r => r.r1 - r.r0 > 0).sort((p, q) => (q.r1 - q.r0) - (p.r1 - p.r0)).slice(0, 8);
  const fading = rows.filter(r => r.r1 - r.r0 < 0).sort((p, q) => (p.r1 - p.r0) - (q.r1 - q.r0)).slice(0, 8);
  const list = (arr, color) => hbars(arr.map(r => ({ label: r.name, segs: [{ v: Math.abs(r.r1 - r.r0), color }], value: `<b>${r.r1 - r.r0 >= 0 ? '+' : '−'}${egpC(Math.abs(r.r1 - r.r0))}</b>`, sub: `${egpC(r.r1)} now · vehicles ${fmtInt(r.v1)} vs ${fmtInt(r.v0)} (${txtDelta(chg(r.v1, r.v0))}) · per RO ${egpC(r.x ? r.x.revPerRo : NaN)}` })), { aria: 'Model revenue change' });
  const ins = [];
  const newTot = rising.reduce((t, r) => t + (r.r1 - r.r0), 0), oldTot = fading.reduce((t, r) => t + (r.r0 - r.r1), 0);
  if (rising.length && fading.length) ins.push(`The top growing models added ${egpC(newTot)} while the top shrinking ones lost ${egpC(oldTot)} against the same months last year — the serviced fleet is moving to ${rising.slice(0, 3).map(r => r.name).join(', ')}.`);
  const big = fading.filter(r => r.v0 > 0 && r.v1 / r.v0 < 0.8).slice(0, 3);
  if (big.length) ins.push(`Fewer of these cars come back: ${big.map(r => `${r.name} ${fmtInt(r.v1)} vehicles vs ${fmtInt(r.v0)}`).join('; ')}. Owners of older cars are the main call-back target (see Customers & accounts → lost customers).`);
  return sec('Rising and fading models', `Change in revenue by model against ${periodText(f)}. Models with at least 30 vehicles in either period.`, `<div class="two"><div><h3>Growing</h3>${list(rising, 'var(--on)')}</div><div><h3>Shrinking</h3>${list(fading, 'var(--below)')}</div></div>${ins.length ? `<ul class="insights" style="margin-top:12px">${ins.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`);
}

/* vehicles that came back within 30 days for a non-maintenance mechanical job (possible re-work) */
function comebackSection() {
  const S = A.S, V = C.buildVisits(S);
  if (!S._roX) { const nR = S.roKeys.length, adv = new Int32Array(nR).fill(-1), net = new Float64Array(nR), model = new Int32Array(nR).fill(-1); for (let i = 0; i < S.n; i++) { const r = S.ro[i]; net[r] += S.net[i]; if (adv[r] < 0) adv[r] = S.adv[i]; if (model[r] < 0) model[r] = S.model[i]; } S._roX = { adv, net, model }; }
  const X = S._roX, br = curSet(false), s0 = A.f.s * 100 + 1, e0 = A.f.e * 100 + 31, days = d => Math.round(C.intToDate(d) / 86400000);
  let base = 0; const list = [], byBr = new Map(), byAdv = new Map();
  const add = (m, k, cb) => { const o = m.get(k) || { n: 0, cb: 0 }; o.n++; if (cb) o.cb++; m.set(k, o); };
  for (const ros of V.byVin.values()) {
    const em = ros.filter(r => V.roAct[r] === 0 && X.net[r] > 0).sort((p, q) => V.roDay[p] - V.roDay[q]);
    for (let k = 0; k < em.length; k++) {
      const r = em[k], d = V.roDay[r];
      if (d < s0 || d > e0) continue;
      if (br && !br.has(S.roBranch[r])) continue;
      base++;
      const nx = em[k + 1];
      const gap = nx != null ? days(V.roDay[nx]) - days(d) : 999;
      const cb = nx != null && gap >= 1 && gap <= 30 && !V.roPer[nx];
      add(byBr, S.roBranch[r], cb); add(byAdv, X.adv[r], cb);
      if (cb) list.push({ r, nx, gap });
    }
  }
  if (base < 50) return '';
  const rate = list.length / base;
  const bRows = [...byBr].filter(([, o]) => o.n >= 30).sort((p, q) => q[1].cb / q[1].n - p[1].cb / p[1].n);
  const aRows = [...byAdv].filter(([, o]) => o.n >= 80).sort((p, q) => q[1].cb / q[1].n - p[1].cb / p[1].n).slice(0, 12);
  const recent = list.sort((p, q) => V.roDay[q.nx] - V.roDay[p.nx]).slice(0, 40);
  return sec('Comebacks — returned within 30 days', `Mechanical (EM) visits in ${periodText(A.f)} followed by another non-maintenance EM visit of the same vehicle within 1–30 days: ${pct(rate)} (${fmtInt(list.length)} of ${fmtInt(base)}). A high rate can mean repeat repairs, parts awaited or a split repair order — check the list. The branch and advisor are those of the first visit.`,
    `<div class="two"><div>${hbars(bRows.map(([k, o]) => ({ label: S.branches[k], segs: [{ v: o.cb / o.n, color: o.cb / o.n > rate * 1.3 ? 'var(--below)' : branchColor(S.branches[k]) }], value: `<b>${pct(o.cb / o.n)}</b>`, sub: `${fmtInt(o.cb)} of ${fmtInt(o.n)} visits` })), { max: Math.max(0.05, ...bRows.map(([, o]) => o.cb / o.n)), aria: 'Comebacks by branch' })}</div><div>${hbars(aRows.map(([k, o]) => ({ label: k >= 0 ? S.advs[k] : '—', segs: [{ v: o.cb / o.n, color: 'var(--c2)' }], value: `<b>${pct(o.cb / o.n)}</b>`, sub: `${fmtInt(o.cb)} of ${fmtInt(o.n)} visits` })), { max: Math.max(0.05, ...aRows.map(([, o]) => o.cb / o.n)), aria: 'Comebacks by advisor' })}<p class="mini">Advisors with 80+ visits, highest rates.</p></div></div>` +
    `<details class="box"><summary>Latest ${recent.length} comebacks</summary>${table(['VIN', 'Model', 'First visit', 'Came back', 'Days', 'Branch', 'Advisor', 'First RO', 'Return RO'], recent.map(c => [esc(S.vins[V.roVin[c.r]] || ''), esc(S.models[X.model[c.r]] || ''), dayLbl(V.roDay[c.r]), dayLbl(V.roDay[c.nx]), fmtInt(c.gap), esc(S.branches[S.roBranch[c.r]]), esc(X.adv[c.r] >= 0 ? S.advs[X.adv[c.r]] : ''), esc(S.roKeys[c.r].split('|')[1] || ''), esc(S.roKeys[c.nx].split('|')[1] || '')]), { maxH: 420 })}</details>`);
}

/* effective labour rate month by month against last year */
function labourRateTrend() {
  const ms = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) ms.push(m);
  if (ms.length < 2) { const e = A.f.e; ms.length = 0; for (let m = C.ymAdd(e, -11); m <= e; m = C.ymAdd(m, 1)) if (A.coverage.has(m)) ms.push(m); }
  if (ms.length < 2) return '';
  const rate = m => { if (!A.coverage.has(m)) return null; const s = stats(m, m).sm; return s.hours > 0 ? s.labour / s.hours : null; };
  const v = ms.map(rate), w = ms.map(m => rate(m - 100)), pv = ms.map(m => rate(C.ymAdd(m, -1)));
  const chg = (a, b) => (a != null && b ? (a - b) / b : null);
  const a1 = sec('Effective labour rate — against the same month last year', 'Labour revenue ÷ billed labour hours, with the same month a year earlier. A falling rate with steady hours points to discounts or low-rate jobs.', lineChart({ labels: ms.map(ymLbl), series: [{ name: 'EGP per billed hour', color: 'var(--blue)', values: v }, { name: 'Same month last year', color: 'var(--grey-l)', values: w }], fmt: 'money', aria: 'Labour rate against last year' }) + `<details class="box"><summary>Exact values</summary>${table(['Month', 'EGP per hour', 'Same month last year', 'Change'], ms.map((m, k) => [ymLbl(m), v[k] != null ? egp(v[k]) : '—', w[k] != null ? egp(w[k]) : '—', chg(v[k], w[k]) != null ? deltaChip(chg(v[k], w[k])) : '—']))}</details>`);
  const a2 = sec('Effective labour rate — against the previous month', 'The same rate with the month before, to see the month-to-month movement.', lineChart({ labels: ms.map(ymLbl), series: [{ name: 'EGP per billed hour', color: 'var(--blue)', values: v }, { name: 'Previous month', color: 'var(--c3)', values: pv }], fmt: 'money', aria: 'Labour rate against the previous month' }) + `<details class="box"><summary>Exact values</summary>${table(['Month', 'EGP per hour', 'Previous month', 'Change'], ms.map((m, k) => [ymLbl(m), v[k] != null ? egp(v[k]) : '—', pv[k] != null ? egp(pv[k]) : '—', chg(v[k], pv[k]) != null ? deltaChip(chg(v[k], pv[k])) : '—']))}</details>`);
  return `<div class="two">${a1}${a2}</div>`;
}

/* how much of each month is billed in its last five days */
function billingRhythm() {
  const S = A.S; let ms = []; for (let m = A.f.s; m <= A.f.e; m = C.ymAdd(m, 1)) if (A.coverage.has(m)) ms.push(m);
  if (ms.length < 2) ms = monthOptions().filter(m => m <= A.f.e).slice(-12); if (ms.length < 2) return '';
  const f = F({ s: ms[0], e: ms[ms.length - 1] }); const idx = C.select(S, f);
  const tot = new Map(), last = new Map();
  for (const i of idx) { const ym = S.ym[i], d = S.day[i] % 100, dim = C.daysInMonth(ym); tot.set(ym, (tot.get(ym) || 0) + S.net[i]); if (d > dim - 5) last.set(ym, (last.get(ym) || 0) + S.net[i]); }
  const vals = ms.map(m => (tot.get(m) ? (last.get(m) || 0) / tot.get(m) : null));
  const fin = vals.filter(Number.isFinite), avg = fin.reduce((t, v) => t + v, 0) / (fin.length || 1);
  return sec('Month-end billing rush', `Share of each month's revenue billed in its last five days, for the months in the period (an even spread is about 16%). Average over these months: ${pct(avg)}. A high share means work is held back to the month end — risky for the target if anything slips.`, lineChart({ labels: ms.map(ymLbl), series: [{ name: 'Billed in the last 5 days', color: 'var(--c3)', values: vals }], missing: ms.map(m => !A.coverage.has(m)), fmt: 'pct', aria: 'Month-end billing share' }));
}
pagePdi = (orig => () => { const h = orig(); return h + (A.S && A.S.n ? comebackSection() : ''); })(pagePdi);
pageLabour = (orig => () => orig() + labourRateTrend())(pageLabour);
pageTrends = (orig => () => orig() + billingRhythm())(pageTrends);

/* ======================= numbering registry ======================= */
/* Every chart/table helper records an export block; sec(), cards() and miniCard() turn the
   pending blocks into a numbered item "page.item" (sub-items "page.item.n"). */
const NUM = { page: 1, n: 0, pending: [], subs: [], items: [] };
function numReset(pageIdx) { NUM.page = pageIdx + 1; NUM.n = 0; NUM.pending = []; NUM.subs = []; NUM.items = []; }
const _tx = typeof document !== 'undefined' ? document.createElement('div') : null;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', middot: '·', ndash: '–', mdash: '—', rarr: '→', larr: '←', uarr: '↑', darr: '↓', times: '×', hellip: '…' };
function txt(h) { if (h == null) return ''; const s = String(h).replace(/[▲▼■]\s?/g, ''); if (!/[<&]/.test(s)) return s.replace(/\s+/g, ' ').trim(); return s.replace(/<br\s*\/?>/gi, ' · ').replace(/<div[^>]*>/gi, ' · ').replace(/<\/(div|p|li|td)>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] != null ? ENT[e] : m)).replace(/\s+/g, ' ').replace(/( · )+/g, ' · ').replace(/^ · | · $/g, '').trim(); }
/* wide tables in PowerPoint/PDF keep the main figure of each cell (the sub-lines stay in Excel and on screen) */
const cellMain = (c, i, nc) => { const t = String(c); return nc > 9 && i ? t.split(' · ')[0] : t; };
function pushBlock(b) { NUM.pending.push(b); }
function takeItem(title, desc) {
  if (!NUM.pending.length && !NUM.subs.length) return null;
  NUM.n++;
  const id = `${NUM.page}.${NUM.n}`, page = PAGES[NUM.page - 1];
  const item = { id, title: txt(title), desc: txt(desc || ''), blocks: NUM.pending, page: page ? page.name : '', subs: [] };
  NUM.pending = [];
  NUM.items.push(item);
  NUM.subs.forEach((s, i) => { s.id = `${id}.${i + 1}`; s.parent = id; s.page = item.page; s.title = `${item.title} — ${s.title}`; item.subs.push(s.id); NUM.items.push(s); });
  NUM.subs = [];
  return item;
}
/* which numbered items open folded, per tab (item numbers inside the tab); a label other than "Show the chart" is given per item */
const FOLD = {
  history: { from: 3, label: { 2: 'Show the table', 12: 'Show the table', 13: 'Show the table', 3: 'Show the table', 4: 'Show the table', 5: 'Show the table', 6: 'Show the table', 7: 'Show the table', 8: 'Show the table', 9: 'Show the table', 10: 'Show the table', 11: 'Show the table' } },
  focus: { from: 10, label: { 18: 'Show the table', 10: 'Show the tables', 11: 'Show the tables', 12: 'Show the tables', 13: 'Show the tables', 14: 'Show the tables', 15: 'Show the tables', 16: 'Show the tables', 17: 'Show the tables' } },
  overview: { from: 6 },
  ops: { from: 3 },
  vtp: { from: 3 },
  trends: { from: 3 },
  branches: { from: 3, label: { 11: 'Show the table' } },
  bays: { from: 5 },
  parts: { from: 7, label: { 23: 'Show the table' } },
  labour: { from: 4, label: { 4: 'Show the table' } },
  models: { from: 4, label: { 5: 'Show the table', 9: 'Show the table', 10: 'Show the table' } },
  advisors: { from: 3, label: { 3: 'Show all advisors', 4: 'Show all advisors', 5: 'Show the cards', 6: 'Show the cards', 7: 'Show the table' } },
  customers: { from: 3, label: { 3: 'Show the table', 5: 'Show the table', 8: 'Show the table' } },
};
function foldLabel(it) {
  if (!it || it.parent) return null;
  const pg = PAGES[NUM.page - 1], fc = pg && FOLD[pg.id]; if (!fc) return null;
  const n = +it.id.split('.')[1]; if (n < fc.from) return null;
  return (fc.label && fc.label[n]) || 'Show the chart';
}
/* folded items: on the tab you are looking at, the content is drawn only when you open it (keeps big tabs fast),
   and every section you opened stays open when the page redraws (filters, sorting, top-N choices) */
function foldKey(it) { const pg = PAGES[NUM.page - 1]; return (pg ? pg.id : '') + ':' + it.id; }
function foldOpenSet() { if (!A.openFolds) { try { A.openFolds = new Set(JSON.parse(sessionStorage.getItem('ps.openFolds') || '[]')); } catch (e) { A.openFolds = new Set(); } } return A.openFolds; }
function foldSaveOpen() { try { sessionStorage.setItem('ps.openFolds', JSON.stringify([...foldOpenSet()])); } catch (e) {} }
function foldWrap(lbl, body, it) {
  if (!lbl || /^\s*<details class="box"/.test(body)) {
    // a section that folds its own content: just remember whether it was open
    if (it && /^\s*<details class="box"/.test(body)) { const k = foldKey(it); return body.replace(/^(\s*)<details class="box"/, `$1<details class="box" data-foldk="${esc(k)}"${foldOpenSet().has(k) ? ' open' : ''}`); }
    return body;
  }
  const k = it ? foldKey(it) : '', open = k && foldOpenSet().has(k), pg = PAGES[NUM.page - 1];
  if (open || !k || !pg || pg.id !== A._visPage) return `<details class="box"${k ? ` data-foldk="${esc(k)}"` : ''}${open ? ' open' : ''}><summary>${lbl}</summary>${body}</details>`;
  (A._foldBody = A._foldBody || {})[k] = body;
  return `<details class="box" data-foldk="${esc(k)}" data-lazy="1"><summary>${lbl}</summary><div class="fold-wait mini">Opening…</div></details>`;
}
if (typeof document !== 'undefined') document.addEventListener('toggle', e => {
  const d = e.target; if (!d || !d.dataset || !d.dataset.foldk) return;
  const k = d.dataset.foldk, set = foldOpenSet();
  if (d.open) { set.add(k); if (d.dataset.lazy) { const w = d.querySelector('.fold-wait'), body = A._foldBody && A._foldBody[k]; if (w && body != null) { w.outerHTML = body; delete d.dataset.lazy; } } }
  else set.delete(k);
  foldSaveOpen();
}, true);
const numBadge = id => `<span class="numb" title="Chart / table number — use it in the Output tab">${id}</span>`;
/* ---- tick boxes: every numbered chart, table and box can be ticked on its own tab; the ticks are the Output selection ---- */
let pickCache = { text: null, set: null };
function pickSet() { if (pickCache.text !== A.out.text) pickCache = { text: A.out.text, set: new Set(parseIds(A.out.text)) }; return pickCache.set; }
const pickParent = id => (id.split('.').length > 2 ? id.split('.').slice(0, 2).join('.') : null);
function pickBox(id) {
  const set = pickSet(), par = pickParent(id), own = set.has(id), via = !own && par && set.has(par);
  return `<input type="checkbox" class="pick noprint${via ? ' via' : ''}" data-pick="${id}" ${own || via ? 'checked' : ''} title="${via ? `Included with ${par}` : 'Tick to add to the PowerPoint / PDF / Excel (Output tab)'}" aria-label="Add ${id} to the printout">`;
}
function saveOutText() { try { localStorage.setItem('ps.outText', A.out.text || ''); } catch (e) {} }
/* tick or untick one number; a section includes its boxes, so ticking a box inside a ticked section splits the section into its other boxes */
function togglePick(id, on) {
  let ids = parseIds(A.out.text); const par = pickParent(id);
  const kids = () => [...document.querySelectorAll(`[data-pick^="${id}."]`)].map(n => n.dataset.pick).filter(x => pickParent(x) === id);
  if (on) {
    if (!(par && ids.includes(par)) && !ids.includes(id)) { if (!par) { const k = new Set(kids()); ids = ids.filter(x => !k.has(x)); } ids.push(id); }
  } else if (ids.includes(id)) ids = ids.filter(x => x !== id);
  else if (par && ids.includes(par)) { const sib = [...new Set([...document.querySelectorAll(`[data-pick^="${par}."]`)].map(n => n.dataset.pick).filter(x => pickParent(x) === par && x !== id))]; const at = ids.indexOf(par); ids.splice(at, 1, ...sib); }
  A.out.text = ids.join(', '); saveOutText(); syncPicks();
}
function syncPicks() {
  const set = pickSet();
  document.querySelectorAll('input.pick[data-pick]').forEach(n => { const id = n.dataset.pick, par = pickParent(id), own = set.has(id), via = !own && !!par && set.has(par); n.checked = own || via; n.classList.toggle('via', via); n.title = via ? `Included with ${par}` : 'Tick to add to the PowerPoint / PDF / Excel (Output tab)'; });
  let bar = document.getElementById('pickbar');
  const n = set.size, onOut = PAGES[A.page] && PAGES[A.page].id === 'output';
  if (!bar) { bar = document.createElement('div'); bar.id = 'pickbar'; bar.className = 'pickbar noprint'; document.body.appendChild(bar); }
  bar.hidden = !n || onOut;
  if (n && !onOut) bar.innerHTML = `<span><b>${n}</b> ticked for the printout</span><button class="btn small yellow" data-act="goto" data-page="output">Output →</button><button class="btn small secondary" data-act="pickclear" title="Untick everything">Clear</button>`;
}
function secNum(title, desc, body, right) {
  if (!NUM.pending.length && !NUM.subs.length && body.includes('class="insights"')) { const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(m => txt(m[1])).filter(Boolean); if (items.length) pushBlock({ type: 'text', items }); }
  const it = takeItem(title, desc);
  const b = foldWrap(foldLabel(it), it ? body.replace(/@@SUB(\d+)@@/g, (m, k) => pickBox(`${it.id}.${+k + 1}`) + numBadge(`${it.id}.${+k + 1}`)) : body, it);
  return `<div class="section"${it ? ` id="n-${it.id}"` : ''}><div class="sec-head"><div><h2>${it ? pickBox(it.id) + numBadge(it.id) : ''}${title}</h2>${desc ? `<p>${desc}</p>` : ''}</div>${right || ''}</div>${b}</div>`;
}

/* ======================= page: output ======================= */
const ANALYSIS_PAGES = { vtp: () => pageVtp(), alerts: () => pageAlerts(), parts: () => pageParts(), labour: () => pageLabour(), customers: () => pageCustomers(), overview: () => pageOverview(), trends: () => pageTrends(), compare: () => pageCompareAll(), bays: () => pageBays(), ops: () => pageOps(), pdi: () => pagePdi(), branches: () => pageBranches(), models: () => pageModels(), advisors: () => pageAdvisors(), followup: () => pageFollowup(), cwdetail: () => pageCwDetail(), focus: () => pageFocus(), history: () => pageHistory(), data: () => pageData(), team: () => pageTeam() };
let catalogCache = { key: '', items: [] };
function catalogKey() { return JSON.stringify([A.partsSort || null, A.cwSort || null, A.modelTop || null, A.op ? [A.op.q, A.op.group, [...A.op.months], A.op.showAll] : null, A.cfg.opGroups, A.cfg.opRoutine, A.fBy, A.partsEx ? [...A.partsEx] : null, A.cx, A.cfg.capacity, A.cfg.partCats, A.cfg.partOverride, A.vtpDim, A.partsNoSvc, A.advCard, A.f, A.mode, [...(A.chosen || [])], A.ret, A.fuStatus, A.advScope, A.cmp.mode, A.cmp.ptype, A.cmp.a, A.cmp.b, A.cmp.aS, A.cmp.aE, A.cmp.bS, A.cmp.bE, [...A.cmp.branches], [...A.cmp.months], A.trendGran, A.imports.length, A.S && A.S.n, A.cfg.targetScale]); }
let catalogPending = false;
function collectCatalog() {
  const key = catalogKey(); if (catalogCache.key === key) return catalogCache.items;
  const items = [];
  PAGES.forEach((p, i) => {
    const fn = ANALYSIS_PAGES[p.id]; if (!fn) return;
    if (!['data', 'team'].includes(p.id) && !(A.S && A.S.n)) return;
    numReset(i);
    try { withFilter(fixRange(filterFor(p.id)), fn); items.push(...NUM.items); } catch (e) { console.error(e); }
  });
  catalogCache = { key, items };
  return items;
}
function parseIds(s) { return String(s || '').split(/[\s,;]+/).map(x => x.trim().replace(/^#/, '')).filter(x => /^\d+(\.\d+){1,2}$/.test(x)); }
function pageOutput() {
  const frHtml = `<div class="section"><div class="sec-head"><div><h2>Chart options for the PowerPoint and PDF</h2><p>How many items the top charts show. Vehicle models 11.1 and 11.2: top 5, 10 or 15. Parts 9.10: top 5, 10, 20, 30, 40 or 50 part numbers; 9.11 and 9.12: top 5, 10, 15, 20 or 25. All start at 5, and the same choice applies on the tab itself. For every model, add the “All models by revenue / by car entries” charts at the bottom of the Vehicle models tab.</p></div></div><div style="display:flex;gap:24px;flex-wrap:wrap"><div><div class="lbl" style="margin-bottom:6px">11.1 Models by revenue</div>${modelTopSel('rev', 0, 'out-top-rev')}</div><div><div class="lbl" style="margin-bottom:6px">11.2 Models by car entries</div>${modelTopSel('ent', 0, 'out-top-ent')}</div><div><div class="lbl" style="margin-bottom:6px">9.10 Part numbers</div>${modelTopSel('pn', 0, 'out-top-pn')}</div><div><div class="lbl" style="margin-bottom:6px">9.11 Cash part numbers</div>${modelTopSel('pcash', 0, 'out-top-pcash')}</div><div><div class="lbl" style="margin-bottom:6px">9.12 Warranty part numbers</div>${modelTopSel('pwar', 0, 'out-top-pwar')}</div><div><div class="lbl" style="margin-bottom:6px">12.1 Advisors — EM</div>${modelTopSel('advEM', 0, 'out-top-advem')}</div><div><div class="lbl" style="margin-bottom:6px">12.2 Advisors — BS</div>${modelTopSel('advBS', 0, 'out-top-advbs')}</div></div></div>`;
  // the numbered list needs every tab drawn once; show the page first and build the list right after
  let items = [], pending = false;
  if (catalogCache.key === catalogKey()) items = catalogCache.items;
  else { pending = true; if (!catalogPending) { catalogPending = true; setTimeout(() => { try { collectCatalog(); catalogCache.key = catalogKey(); } catch (e) { console.error(e); catalogCache.key = catalogKey(); } catalogPending = false; if (PAGES[A.page].id === 'output') render(); }, 30); } }
  const byId = new Map(items.map(x => [x.id, x]));
  const o = A.out;
  const ids = parseIds(o.text);
  const unknown = pending ? [] : ids.filter(id => !byId.has(id));
  const chosen = ids.filter(id => byId.has(id));
  const S = A.S;
  const period = S && S.n ? (A.f.s === A.f.e ? ymLbl(A.f.s) : `${ymLbl(A.f.s)} – ${ymLbl(A.f.e)}`) : '';
  /* page order: 1 pick charts (list) → 2 chart options → 3 saved views → 4 build (at the end, uses everything selected above) */
  let build = `<div class="section" id="out-build"><div class="sec-head"><div><h2>${numStep(3)}Build the PowerPoint, PDF or Excel</h2><p>Everything selected above goes into the file, in this order. You can also type or reorder the numbers here (for example <b>1.1, 5.1, 5.6.3, 6.4</b>). Every chart and table in the studio carries its number in a black badge. The output uses the current filters (${esc(period)} · ${esc(scopeText())}) and the official Renault After-Sales template: cover, contents, one numbered slide per chart or table, and a closing slide.</p></div></div>
  ${quickHtml(ids)}
  <div class="toolbar" style="margin:0 0 12px;align-items:flex-start">
    <div class="field wide" style="flex:3"><label for="out-ids">Chart and table numbers</label><textarea id="out-ids" class="inp" rows="2" data-out="text" placeholder="e.g. 1.1, 1.3, 5.1, 6.2">${esc(o.text)}</textarea>${unknown.length ? `<div class="error" style="margin:6px 0 0">Not found with the current filters: ${esc(unknown.join(', '))}</div>` : ''}</div>
    <div class="field wide"><label for="out-title">Report title</label><input id="out-title" class="inp" data-out="title" value="${esc(o.title)}"></div>
    <div class="field wide"><label for="out-by">Prepared by</label><input id="out-by" class="inp" data-out="by" value="${esc(o.by || (A.me && A.me.name) || '')}"></div>
  </div>
  <div class="choices"><label class="choice"><input type="checkbox" data-out="cover" ${o.cover !== false ? 'checked' : ''}> Cover slide (first page)</label><label class="choice"><input type="checkbox" data-out="contents" ${o.contents ? 'checked' : ''}> Contents slide</label><label class="choice"><input type="checkbox" data-out="closing" ${o.closing ? 'checked' : ''}> Closing slide</label><label class="choice"><input type="checkbox" data-out="notes" ${o.notes ? 'checked' : ''}> Values table beside bar charts</label></div>
  <div class="choices" style="margin-top:4px"><span class="mini" style="align-self:center">PowerPoint &amp; PDF look:</span><label class="choice ${o.look !== 'edit' ? 'on' : ''}"><input type="radio" name="outlook" data-out="look" value="app" ${o.look !== 'edit' ? 'checked' : ''}> As in the studio (boxes, charts and tables exactly as on screen)</label><label class="choice ${o.look === 'edit' ? 'on' : ''}"><input type="radio" name="outlook" data-out="look" value="edit" ${o.look === 'edit' ? 'checked' : ''}> Editable (PowerPoint charts and tables you can change)</label></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px"><button class="btn yellow" data-act="outpptx" ${chosen.length ? '' : 'disabled'}>PowerPoint (${chosen.length})</button><button class="btn" data-act="outpdf" ${chosen.length ? '' : 'disabled'}>PDF (${chosen.length})</button><button class="btn secondary" data-act="outxlsx" ${chosen.length ? '' : 'disabled'} title="Every selected chart and table as data, one sheet each, full tables">Excel (${chosen.length})</button><button class="btn secondary" data-act="outclear" ${ids.length ? '' : 'disabled'}>Clear selection</button></div>
  ${chosen.length ? `<h3>In this output</h3><ol class="outlist">${chosen.map(id => { const it = byId.get(id); return `<li>${numBadge(id)} ${esc(it.title)} <span class="mini">· ${esc(it.page)} · ${it.blocks.map(b => b.type === 'kpis' ? 'figures' : b.type === 'text' ? 'analysis text' : b.type === 'line' ? 'line chart' : b.type === 'bars' ? 'bar chart' : 'table').join(' + ') || 'section'}</span></li>`; }).join('')}</ol>` : ''}</div>`;
  let h = '';
  // catalogue
  const groups = new Map(); for (const it of items) { if (!groups.has(it.page)) groups.set(it.page, []); groups.get(it.page).push(it); }
  const sel = new Set(chosen);
  if (pending) h += `<div class="section"><h2>${numStep(1)}Choose the charts and tables</h2><p class="mini">Preparing the numbered list of charts and tables…</p></div>`; else
  h += `<div class="section"><div class="sec-head"><div><h2>${numStep(1)}Choose the charts and tables</h2><p>Numbers follow the order on each tab. Section-level numbers include their sub-charts; pick a sub-number (such as 5.6.2) for one branch card only. ${chosen.length ? `<b>${chosen.length} selected.</b>` : ''}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary" data-act="outall" title="Every chart and table of the analysis tabs (Data &amp; imports and Team access are left out)">Select all (${items.filter(x => !x.parent && !OUT_SKIP.includes(x.page)).length})</button><button class="btn secondary" data-act="outclear" ${ids.length ? '' : 'disabled'}>Clear selection</button></div></div>${[...groups].map(([pg, list]) => { const top = list.filter(x => !x.parent), nSel = top.filter(x => sel.has(x.id)).length; return `<details class="box" ${list.some(x => sel.has(x.id)) ? 'open' : ''}><summary>${esc(pg)} · ${list.length}${nSel ? ` · ${nSel} selected` : ''}</summary><div style="display:flex;gap:8px;margin:4px 0 8px"><button class="btn small secondary" data-act="outtaball" data-pg="${esc(pg)}">Select all in this tab</button><button class="btn small secondary" data-act="outtabclear" data-pg="${esc(pg)}" ${nSel ? '' : 'disabled'}>Clear this tab</button></div><div class="catalog">${list.map(it => `<label class="choice ${it.parent ? 'sub' : ''}"><input type="checkbox" data-act="outpick" value="${it.id}" ${sel.has(it.id) ? 'checked' : ''}>${numBadge(it.id)}<span>${esc(it.title)}</span></label>`).join('')}</div></details>`; }).join('')}</div>`;
  h += frHtml.replace('<h2>Chart options for the PowerPoint and PDF</h2>', `<h2>${numStep(2)}Chart options for the PowerPoint and PDF</h2>`);
  h += build;
  h += fastReportSection();
  // always-visible bar: how many are selected, with the two buttons
  h += `<div class="outbar" role="region" aria-label="Selected for the PowerPoint and PDF"><span><b>${chosen.length}</b> selected</span><button class="btn secondary small" data-act="outgo" ${chosen.length ? '' : 'disabled'}>Review ↓</button><button class="btn yellow small" data-act="outpptx" ${chosen.length ? '' : 'disabled'}>PowerPoint</button><button class="btn small" data-act="outpdf" ${chosen.length ? '' : 'disabled'}>PDF</button><button class="btn small secondary" data-act="outxlsx" ${chosen.length ? '' : 'disabled'}>Excel</button></div>`;
  return h;
}
const OUT_SKIP = ['Data & imports', 'Team access'];
/* quick printouts: named selections kept for each user (in this browser); admins can also share one with the team (Saved views) */
function quickList() { try { return JSON.parse(localStorage.getItem('ps.quick') || '[]'); } catch (e) { return []; } }
function quickSave(l) { try { localStorage.setItem('ps.quick', JSON.stringify(l)); } catch (e) { toast('This browser does not keep quick printouts.', true); } }
function quickHtml(ids) {
  const mine = quickList(), team = (A.views || []).filter(v => v.text), admin = isAdmin();
  const MODE = { current: 'uses the period at the top', latest: 'switches to the latest month', ytd: 'switches to year to date', fixed: 'switches to its saved period' };
  const btn = (q, isTeam) => {
    const n = parseIds(q.ids || q.text).length, key = (isTeam ? 't:' : '') + q.id, attr = `data-id="${esc(q.id)}"${isTeam ? ' data-team="1"' : ''}`;
    if (A.qEdit === key) return `<span class="qchip edit"><input id="q-rename" class="inp" value="${esc(q.name)}" style="width:190px;padding:6px 8px"><button class="btn small" data-act="qrename" ${attr}>Rename</button><button class="btn small secondary" data-act="qupdate" ${attr} ${ids.length ? '' : 'disabled'} title="Replace its items with the ones ticked now">Use ticked (${ids.length})</button><button class="btn small secondary" data-act="qdel" ${attr}>Delete</button></span>`;
    const tip = `${q.ids || q.text} — ${MODE[q.mode] || MODE.current}${q.mode === 'fixed' && q.period ? ' (' + q.period + ')' : ''}`;
    return `<span class="qchip${isTeam ? ' team' : ''}"><button class="btn ${isTeam ? 'secondary' : ''}" data-act="qload" ${attr} title="${esc(tip)}">${esc(q.name)} <span class="mini">(${n}${q.mode && q.mode !== 'current' ? ' · ' + (q.mode === 'ytd' ? 'YTD' : q.mode === 'latest' ? 'latest' : 'fixed') : ''})</span></button><button class="btn small secondary" data-act="qpptx" ${attr} title="Build the PowerPoint now">PPT</button><button class="btn small secondary" data-act="qpdf" ${attr} title="Build the PDF now">PDF</button>${isTeam ? `<span class="mini">team</span>${admin ? `<button class="btn small secondary" data-act="qedit" data-id="t:${esc(q.id)}" title="Rename, update or delete">✎</button>` : ''}` : `<button class="btn small secondary" data-act="qedit" data-id="${esc(q.id)}" title="Rename, update or delete">✎</button>`}</span>`;
  };
  return `<div class="quick"><div class="lbl" style="margin-bottom:6px">Saved printouts — press a name to tick its charts (then PowerPoint, PDF or Excel), or press PPT / PDF to build it straight away</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">${mine.map(q => btn(q, false)).join('')}${team.map(q => btn(q, true)).join('')}${!mine.length && !team.length ? '<span class="mini">None yet. Tick charts on any tab (or in step 1), give the selection a name below and save it.</span>' : ''}</div>
  <div class="toolbar" style="margin:10px 0 0;align-items:flex-end"><div class="field wide"><label for="q-name">Save the ${ids.length} ticked item${ids.length === 1 ? '' : 's'} as</label><input id="q-name" class="inp" placeholder="e.g. Monthly GM pack"></div><div class="field"><label for="q-mode">Period when pressed</label><select id="q-mode"><option value="current">The period at the top</option><option value="latest">Latest month</option><option value="ytd">Year to date (latest)</option><option value="fixed">Exactly as now</option></select></div>${admin ? '<label class="choice" style="min-height:40px"><input type="checkbox" id="q-team"> Share with the team</label>' : ''}<button class="btn secondary" data-act="qsave" ${ids.length ? '' : 'disabled'}>Save printout</button></div>
  <p class="mini" style="margin:6px 0 0">Your own printouts are kept in this browser; printouts shared with the team (admins) are visible to everyone and replace the former “Saved views”.</p></div>`;
}
document.addEventListener('toggle', () => setTimeout(syncPicks, 30), true);
/* ======================= chart finder (the app map) =======================
   One search over every numbered chart and table of every tab: type a number (9.6), words (same day, RN-,
   warranty labour) or a tab name, then Enter or click to open that tab, unfold the item and scroll to it. */
function finderOpen() {
  if (!A.S || !A.S.n) { toast('Import the DSR files first.', true); return; }
  let ov = $('finder'); if (!ov) { ov = document.createElement('div'); ov.id = 'finder'; ov.className = 'finder'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Find a chart or table'); document.body.appendChild(ov); }
  ov.innerHTML = `<div class="finder-box"><div class="finder-head"><input id="finder-q" class="inp" placeholder="Type a number (9.6) or words (same day, RN-, warranty labour, VTP)…" autocomplete="off" aria-label="Find a chart or table"><button class="btn small secondary" data-act="finderclose" aria-label="Close">Esc</button></div><div class="finder-list" id="finder-list"><p class="mini" style="padding:14px">Preparing the map of every tab…</p></div><div class="finder-foot mini">↑ ↓ to move · Enter to open · the list is the map of the whole studio, tab by tab</div></div>`;
  ov.hidden = false; ov.onclick = e => { if (e.target === ov) finderClose(); };
  const q = $('finder-q'); q.focus(); q.oninput = () => finderDraw(q.value); q.onkeydown = finderKeys;
  setTimeout(() => { const keep = A.page; try { A._finderItems = collectCatalog(); } catch (e) { console.error(e); A._finderItems = []; } A.page = keep; finderDraw(q.value); }, 20);
}
function finderClose() { const ov = $('finder'); if (ov) ov.hidden = true; }
function finderDraw(text) {
  const box = $('finder-list'); if (!box || !A._finderItems) return;
  const terms = C.normOp(text || '').split(/\s+/).filter(Boolean), num = /^\d+(\.\d+)*\.?$/.test((text || '').trim()) ? (text || '').trim().replace(/\.$/, '') : '';
  const all = A._finderItems.filter(it => !it.parent && !OUT_SKIP.includes(it.page));
  // words: titles and tab names first; the descriptions are searched only when no title matches
  const inTitle = it => terms.every(t => C.normOp(it.id + ' ' + it.title + ' ' + it.page).includes(t)), inDesc = it => terms.every(t => C.normOp(it.id + ' ' + it.title + ' ' + it.page + ' ' + (it.desc || '')).includes(t));
  const useDesc = !num && terms.length && !all.some(inTitle);
  const hit = it => (num ? it.id === num || it.id.startsWith(num + '.') : useDesc ? inDesc(it) : inTitle(it));
  const groups = new Map(); for (const it of all) { if (!hit(it)) continue; if (!groups.has(it.page)) groups.set(it.page, []); groups.get(it.page).push(it); }
  let k = 0;
  box.innerHTML = groups.size ? [...groups].map(([pg, l]) => { const pi = PAGES.findIndex(p => p.name === pg); return `<div class="finder-grp"><button class="finder-tab" data-act="findergo" data-pg="${pi}"><span class="tno">${pi + 1}</span>${esc(pg)} <span class="mini">· ${l.length}</span></button>${l.map(it => `<button class="finder-it ${k++ === 0 ? 'on' : ''}" data-act="findergo" data-pg="${pi}" data-id="${esc(it.id)}">${numBadge(it.id)}<span>${esc(it.title)}</span></button>`).join('')}</div>`; }).join('') : `<p class="mini" style="padding:14px">Nothing matches “${esc(text)}”. Try fewer words, or a number such as 10.4.</p>`;
}
function finderKeys(e) {
  const list = [...document.querySelectorAll('#finder-list .finder-it')], i = list.findIndex(x => x.classList.contains('on'));
  if (e.key === 'Escape') { e.preventDefault(); finderClose(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!list.length) return; const j = Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + (e.key === 'ArrowDown' ? 1 : -1))); list.forEach(x => x.classList.remove('on')); list[j].classList.add('on'); list[j].scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter') { e.preventDefault(); const t = list[i >= 0 ? i : 0]; if (t) finderGo(+t.dataset.pg, t.dataset.id); }
}
function finderGo(pi, id) {
  finderClose(); if (!(pi >= 0)) return;
  A.page = pi; try { localStorage.setItem('ps.page', PAGES[pi].id); } catch (e) {}
  if (id) { const set = foldOpenSet(); set.add(PAGES[pi].id + ':' + id); foldSaveOpen(); }
  render(); window.scrollTo(0, 0);
  if (!id) return;
  setTimeout(() => {
    const el = $('n-' + id); if (!el) return;
    el.querySelectorAll(':scope details[data-lazy], :scope > details, :scope details[data-lazyt]').forEach(d => { if (!d.open) d.open = true; });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200);
  }, 60);
}
const numStep = n => `<span class="step">${n}</span>`;
function outputItems() { const items = collectCatalog(); const byId = new Map(items.map(x => [x.id, x])); return parseIds(A.out.text).filter(id => byId.has(id)).map(id => byId.get(id)); }
function expandItem(it, all) {
  // a parent with sub-items but no own blocks exports each sub-item
  if (it.blocks.length || !it.subs.length) return [it];
  const m = new Map(all.map(x => [x.id, x])); return it.subs.map(id => m.get(id)).filter(Boolean);
}

/* ======================= official template export ======================= */
let logoCache = null;
async function logos() {
  if (logoCache) return logoCache;
  const img = document.querySelector('.brand img.logo');
  let white = img ? img.src : null, black = null, ratio = 0.733;
  if (white) {
    await new Promise(r => { if (img.complete && img.naturalWidth) return r(); img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 2000); });
    ratio = img.naturalWidth / img.naturalHeight || ratio;
    try { const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d'); x.drawImage(img, 0, 0); if (!/^data:/.test(white)) white = cv.toDataURL('image/png'); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#171717'; x.fillRect(0, 0, cv.width, cv.height); black = cv.toDataURL('image/png'); } catch (e) { black = null; }
  }
  logoCache = { white, black, ratio };
  return logoCache;
}
/* output palettes of the Renault template: yellow first for bars, blue first for lines */
const OPAL = ['EFDF00', '1E22AA', 'BB28BB', '888B8D', 'C98300', '1F8A74', 'D9475E', '6158C9', '0087B0', '9A5A2E', '8A9C13', 'A052B5', '2C6E49'];
const OPAL_L = ['1E22AA', 'D4C400', 'BB28BB', '888B8D', 'C98300', '1F8A74', 'D9475E', '6158C9', '0087B0', '9A5A2E', '8A9C13', 'A052B5', '2C6E49'];
const PAL = ['1E22AA', 'BB28BB', 'C98300', '1F8A74', 'D9475E', '6158C9', '9A5A2E', '0087B0', '5F656B', '8A9C13', 'A052B5', '2C6E49', 'C2410C'];
function chunk(arr, n) { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out.length ? out : [[]]; }
/* turn items into template pages: one page per block (long tables and bar lists continue on further pages) */
function outputPages(items, opts) {
  const pages = [];
  for (const it of items) {
    if (!it.blocks.length) { pages.push({ it, block: { type: 'empty' } }); continue; }
    it.blocks.forEach((b, bi) => {
      const suffix = it.blocks.length > 1 ? ` (${bi + 1}/${it.blocks.length})` : '';
      if (b.type === 'table') { const per = b.head.length > 9 ? 18 : 20; chunk(b.rows, per).forEach((rows, k, arr) => pages.push({ it, suffix: suffix + (arr.length > 1 ? ` · part ${k + 1} of ${arr.length}` : ''), block: Object.assign({}, b, { rows }) })); }
      else if (b.type === 'bars') { const n = b.labels.length; const idx = [...Array(n).keys()]; chunk(idx, 20).forEach((ix, k, arr) => pages.push({ it, suffix: suffix + (arr.length > 1 ? ` · part ${k + 1} of ${arr.length}` : ''), block: Object.assign({}, b, { labels: ix.map(i => b.labels[i]), values: ix.map(i => b.values[i]), series2: b.series2 ? ix.map(i => b.series2[i]) : null, stack: b.stack ? b.stack.map(s => ({ name: s.name, values: ix.map(i => s.values[i]) })) : null, notes: b.notes ? ix.map(i => b.notes[i]) : null, marker: b.marker ? ix.map(i => b.marker[i]) : null }) })); }
      else pages.push({ it, suffix, block: b });
    });
  }
  return pages;
}
async function exportOutput(kind) {
  const items0 = outputItems(); if (!items0.length) return;
  const all = collectCatalog();
  const items = items0.flatMap(it => expandItem(it, all));
  const S = A.S, o = A.out;
  const meta = { title: o.title || 'After-Sales Performance Review', period: S && S.n ? (A.f.s === A.f.e ? ymLbl(A.f.s) : `${ymLbl(A.f.s)} – ${ymLbl(A.f.e)}`) : '', scope: scopeText(), by: o.by || (A.me && A.me.name) || '', dataTo: S && S.n ? dayLbl(S.maxDay) : '—', generated: tsLbl(Date.now()) };
  const pict = kind !== 'xlsx' && o.look !== 'edit';
  let pages = pict ? null : outputPages(mergeKpiPicks(items, all), o);
  const file = `${meta.title} ${meta.period}`.replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  setBusy(`Building ${kind === 'pptx' ? 'PowerPoint' : kind === 'xlsx' ? 'Excel file' : 'PDF'}${pages ? ` (${pages.length} content page${pages.length > 1 ? 's' : ''})` : pict ? ` — drawing ${items0.length} item${items0.length > 1 ? 's' : ''} as on screen` : ''}`);
  try {
    const L = await logos();
    if (pict) pages = await picturePages(items0, all, kind, o);
    if (kind === 'xlsx') { if (!window.XLSX) await loadScript(LIB.xlsx); let blob = buildXlsx(items, meta, o); try { blob = await styleBook(blob, blob.specs); } catch (e) { console.warn('Excel theme skipped', e); } setBusy(null); await saveFile(file + '.xlsx', blob); }
    else if (kind === 'pptx') { await loadScript(LIB.pptx); const blob = await buildPptx(pages, items, meta, L, o); setBusy(null); await saveFile(file + '.pptx', blob); }
    else { await loadScript(LIB.jspdf); const blob = buildPdf(pages, items, meta, L, o); setBusy(null); await saveFile(file + '.pdf', blob); }
    audit('Output exported', `${kind.toUpperCase()} · ${items0.map(x => x.id).join(', ')}`);
  } catch (e) { setBusy(null); console.error(e); toast('Export failed: ' + (e.message || e), true); }
}
/* Excel in the Renault template: Inter everywhere, bold titles, yellow header rows (applied to the finished workbook) */
async function themeXlsx(blob, hasContents) {
  if (!window.JSZip) await loadScript(LIB.jszip);
  const z = await window.JSZip.loadAsync(await blob.arrayBuffer());
  let st = await z.file('xl/styles.xml').async('string');
  const cnt = (tag) => { const m = st.match(new RegExp(`<${tag} count="(\\d+)"`)); return m ? +m[1] : 0; };
  const nF = cnt('fonts'), nFi = cnt('fills'), nX = cnt('cellXfs');
  st = st.replace(/<name val="Calibri"\/>/g, '<name val="Inter"/>').replace(/<sz val="12"\/>/, '<sz val="10"/>');
  st = st.replace(/<fonts count="\d+">([\s\S]*?)<\/fonts>/, (m, inner) => `<fonts count="${nF + 3}">${inner}<font><b/><sz val="14"/><color rgb="FF000000"/><name val="Inter"/></font><font><b/><sz val="10"/><color rgb="FF000000"/><name val="Inter"/></font><font><sz val="9"/><color rgb="FF888B8D"/><name val="Inter"/></font></fonts>`);
  st = st.replace(/<fills count="\d+">([\s\S]*?)<\/fills>/, (m, inner) => `<fills count="${nFi + 1}">${inner}<fill><patternFill patternType="solid"><fgColor rgb="FFEFDF00"/><bgColor indexed="64"/></patternFill></fill></fills>`);
  st = st.replace(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/, (m, inner) => `<cellXfs count="${nX + 3}">${inner}<xf numFmtId="0" fontId="${nF}" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="${nF + 1}" fillId="${nFi}" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="${nF + 2}" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>`);
  z.file('xl/styles.xml', st);
  const sTitle = nX, sHead = nX + 1, sDesc = nX + 2;
  const sheets = Object.keys(z.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
  for (const [k, n] of sheets.entries()) {
    let x = await z.file(n).async('string');
    const headRow = hasContents && k === 0 ? 5 : 4;
    const styleRow = (r, sid) => { x = x.replace(new RegExp(`<row r="${r}"([^>]*)>([\\s\\S]*?)</row>`), (m, at, inner) => `<row r="${r}"${at}>${inner.replace(/<c r="([A-Z]+\d+)"( s="\d+")?/g, (mm, ref) => `<c r="${ref}" s="${sid}"`)}</row>`); };
    styleRow(1, sTitle); styleRow(2, sDesc); if (hasContents && k === 0) styleRow(3, sDesc); styleRow(headRow, sHead);
    z.file(n, x);
  }
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* Excel colours for every export: a title, a grey note, black headings, light row stripes, totals in light yellow,
   green/red changes, frozen headings and a real Excel table (filter and sort buttons) under each heading row */
/* text cells as inline strings (SheetJS writes t="str", which is meant for formula results) */
const xlInline = x => x.replace(/<c ([^>]*?)t="str"([^>]*)><v>([\s\S]*?)<\/v><\/c>/g, '<c $1t="inlineStr"$2><is><t xml:space="preserve">$3</t></is></c>');
const XLF = { n: 0, title: 1, note: 2, b: 3, bw: 4, g: 5, r: 6 };
async function styleBook(blob, specs) {
  if (!window.JSZip) await loadScript(LIB.jszip);
  const z = await window.JSZip.loadAsync(await blob.arrayBuffer());
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fonts = [['', '10', 'FF000000'], ['<b/>', '14', 'FF000000'], ['', '9', 'FF6E6E6E'], ['<b/>', '10', 'FF000000'], ['<b/>', '10', 'FFFFFFFF'], ['<b/>', '10', 'FF1E8E3E'], ['<b/>', '10', 'FFD93025']];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], fillIx = new Map();
  const fill = rgb => { if (!rgb) return 0; if (!fillIx.has(rgb)) { fillIx.set(rgb, fills.length); fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`); } return fillIx.get(rgb); };
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], xfIx = new Map();
  const xf = (num, font, rgb, border, al) => { const fl = fill(rgb), k = [num, font, fl, border, al].join('|'); if (!xfIx.has(k)) { xfIx.set(k, xfs.length); xfs.push(`<xf numFmtId="${num}" fontId="${font}" fillId="${fl}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${al ? ` applyAlignment="1"><alignment ${al}/></xf>` : '/>'}`); } return xfIx.get(k); };
  const sheets = Object.keys(z.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
  let ct = await z.file('[Content_Types].xml').async('string'), tno = 0;
  for (const [k, n] of sheets.entries()) {
    const sp = specs[k]; if (!sp) continue;
    let x = await z.file(n).async('string');
    const S = new Map(); for (const [ref, st] of sp.cells) S.set(ref, xf(st[0], st[1], st[2], st[3], st[4] || ''));
    x = x.replace(/<c r="([A-Z]+\d+)"( s="\d+")?/g, (m, ref) => (S.has(ref) ? `<c r="${ref}" s="${S.get(ref)}"` : `<c r="${ref}"`));
    for (const [r, ht] of Object.entries(sp.heights || {})) x = x.replace(`<row r="${r}"`, `<row r="${r}" ht="${ht}" customHeight="1"`);
    const pane = sp.freeze ? `<pane${sp.freeze.x ? ` xSplit="${sp.freeze.x}"` : ''} ySplit="${sp.freeze.y}" topLeftCell="${sp.freeze.cell}" activePane="${sp.freeze.x ? 'bottomRight' : 'bottomLeft'}" state="frozen"/><selection pane="${sp.freeze.x ? 'bottomRight' : 'bottomLeft'}" activeCell="${sp.freeze.cell}" sqref="${sp.freeze.cell}"/>` : '';
    x = x.replace(/<sheetView workbookViewId="0"\/>/, `<sheetView workbookViewId="0" showGridLines="0" zoomScale="90" zoomScaleNormal="90">${pane}</sheetView>`);
    const tbls = (sp.tables || []).filter(t => t.names.length && t.names.every(v => typeof v === 'string' && v.trim()) && new Set(t.names.map(v => v.trim().toLowerCase())).size === t.names.length);
    if (tbls.length) {
      x = x.replace(/<autoFilter[^>]*\/>/, '');
      const rels = [];
      for (const t of tbls) {
        tno++; const id = `rIdTbl${tno}`; rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tno}.xml"/>`);
        z.file(`xl/tables/table${tno}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${tno}" name="Table${tno}" displayName="Table${tno}" ref="${t.ref}" totalsRowShown="0"><autoFilter ref="${t.ref}"/><tableColumns count="${t.names.length}">${t.names.map((h, c) => `<tableColumn id="${c + 1}" name="${xe(h)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/></table>`);
        ct = ct.replace('</Types>', `<Override PartName="/xl/tables/table${tno}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`);
      }
      const rn = n.replace('worksheets/', 'worksheets/_rels/') + '.rels', old = z.file(rn) ? await z.file(rn).async('string') : null;
      z.file(rn, old ? old.replace('</Relationships>', rels.join('') + '</Relationships>') : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join('')}</Relationships>`);
      x = x.replace(/<\/worksheet>$/, `<tableParts count="${tbls.length}">${tbls.map((t, i) => `<tablePart r:id="rIdTbl${tno - tbls.length + i + 1}"/>`).join('')}</tableParts></worksheet>`);
    }
    z.file(n, xlInline(x));
  }
  z.file('[Content_Types].xml', ct);
  z.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="3"><numFmt numFmtId="166" formatCode="+0.0%;-0.0%;0.0%"/><numFmt numFmtId="167" formatCode="0.0%"/><numFmt numFmtId="168" formatCode="+0.0&quot; pp&quot;;-0.0&quot; pp&quot;;0.0&quot; pp&quot;"/></numFmts><fonts count="${fonts.length}">${fonts.map(f => `<font>${f[0]}<sz val="${f[1]}"/><color rgb="${f[2]}"/><name val="Inter"/></font>`).join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`);
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
/* the styles for one sheet: rows (as written), the heading rows of its blocks, and which row is the sheet title */
function sheetSpec(rows, blocks, o) {
  o = o || {}; const X = window.XLSX, cells = new Map(), tables = [], heights = { 1: 24 };
  const ref = (r, c) => X.utils.encode_cell({ r, c });
  if (rows[0] && rows[0][0] != null) cells.set('A1', [0, XLF.title, null, 0]);
  for (let r = 1; r < (blocks.length ? blocks[0].h : rows.length) && r < 4; r++) (rows[r] || []).forEach((v, c) => { if (v !== '' && v != null) cells.set(ref(r, c), [0, XLF.note, null, 0]); });
  const merges = [], headRows = [];
  for (const [bi, b] of blocks.entries()) {
    const head = rows[b.h] || [], nc = Math.max(head.length, ...rows.slice(b.h + 1, b.h + 1 + b.n).map(r => r.length)), G = b.groups && b.groups.length >= nc ? b.groups : null;
    const isChg = c => /change|chg|\bvs\b|growth|var\.?|Δ|evol|diff/i.test(String(head[c] || ''));
    const pal = c => (G ? XL_PAL[G[c]] || XL_PAL.id : c === 0 ? XL_PAL.id : XL_PAL.cur);
    headRows.push(b.h);
    // a band over each group of columns, in the empty row just above the heading
    if (G && b.h > 0 && rows[b.h - 1] && !rows[b.h - 1].some(v => v !== '' && v != null)) {
      const band = rows[b.h - 1]; let c0 = 0;
      for (let c = 1; c <= nc; c++) if (c === nc || G[c] !== G[c0] || (/^br/.test(G[c]) && !isChg(c))) { const g = G[c0]; band[c0] = (b.bands && b.bands[g] != null ? b.bands[g] : String(head[c0] || '').replace(/ units .*$/, '')); for (let j = c0 + 1; j < c; j++) band[j] = ''; if (c - c0 > 1) merges.push({ s: { r: b.h - 1, c: c0 }, e: { r: b.h - 1, c: c - 1 } }); const p = XL_PAL[g] || XL_PAL.id; for (let j = c0; j < c; j++) cells.set(ref(b.h - 1, j), [0, p[1] === 'FFFFFFFF' ? XLF.bw : XLF.b, p[0], 1, 'horizontal="center" vertical="center"']); c0 = c; }
      heights[b.h] = 22;
    }
    for (let c = 0; c < nc; c++) { const p = pal(c); cells.set(ref(b.h, c), [0, p[1] === 'FFFFFFFF' ? XLF.bw : XLF.b, p[0], 1, `horizontal="${c ? 'center' : 'left'}" vertical="center" wrapText="1"`]); }
    heights[b.h + 1] = String(head.join('')).length > nc * 14 ? 44 : 30;
    for (let i = 0; i < b.n; i++) {
      const r = b.h + 1 + i, row = rows[r] || [], grp = !!row._grp, bold = !!row._bold, tot = !grp && (row._total || /^(total|network|all branches|grand total|sum)\b/i.test(String(row[0] || '')));
      for (let c = 0; c < nc; c++) {
        const v = row[c], p = G ? pal(c) : null; let st;
        const bg = grp ? 'FF3A3A3A' : tot ? 'FFFFF5C2' : p ? p[2 + (i % 2)] : i % 2 ? 'FFF4F4F4' : null;
        const okFill = bg === 'FFFFFFFF' ? null : bg;
        if (grp) st = [0, XLF.bw, 'FF3A3A3A', 1, 'vertical="center"'];
        else if (v && typeof v === 'object' && 'pp' in v) st = [168, v.good === undefined ? (v.pp > 0.0005 ? XLF.g : v.pp < -0.0005 ? XLF.r : XLF.n) : Math.abs(v.pp) < 0.0005 ? XLF.b : v.good ? XLF.g : XLF.r, okFill, 1, 'horizontal="center"'];
        else if (v && typeof v === 'object' && 'pct' in v) { const sg = isChg(c) || v.signed, colr = sg || v.good !== undefined; const col = v.good !== undefined ? (Math.abs(v.pct) < 0.0005 && sg ? XLF.b : v.good ? XLF.g : XLF.r) : v.pct > 0.0005 ? XLF.g : v.pct < -0.0005 ? XLF.r : XLF.b; st = [sg ? 166 : 167, colr ? col : tot || bold ? XLF.b : XLF.n, okFill, 1, 'horizontal="center"']; }
        else if (typeof v === 'number') st = [Number.isInteger(v) ? 3 : 4, tot || bold || (c === 1 && G && G[1] === 'cur' && !/^\s/.test(String(row[0]))) ? XLF.b : XLF.n, okFill, 1, ''];
        else st = [0, c === 0 && !/^\s/.test(String(v || '')) || tot ? XLF.b : XLF.n, c === 0 && o.yellowId ? 'FFEFDF00' : okFill, 1, 'vertical="top"'];
        cells.set(ref(r, c), st);
      }
    }
    if (b.n > 0 && b.table !== false && !merges.some(m => m.s.r >= b.h && m.s.r <= b.h + b.n)) tables.push({ ref: `${ref(b.h, 0)}:${ref(b.h + b.n, nc - 1)}`, names: Array.from({ length: nc }, (_, c) => head[c]) });
  }
  const one = blocks.length === 1 ? blocks[0] : null;
  return { cells, tables, heights, merges, headRows, freeze: one && one.n > 12 ? { x: o.freezeCol ? 1 : 0, y: one.h + 1, cell: ref(one.h + 1, o.freezeCol ? 1 : 0) } : null };
}
/* Excel: a Contents sheet, then one sheet per chart or table with its data (numbers as numbers, full tables) */
function xlNum(v) {
  if (typeof v === 'number') return v; if (v && typeof v === 'object') return v; const t = String(v == null ? '' : v).trim(); if (!t || t === '—' || t === 'N/A') return t === '—' || t === 'N/A' ? '' : t;
  let m = t.match(/^(-|−)?(?:EGP\s*)?([\d,]+(?:\.\d+)?)\s*([KMB])?$/i);
  if (m) { let n = +m[2].replace(/,/g, ''); const u = (m[3] || '').toUpperCase(); if (u === 'K') n *= 1e3; else if (u === 'M') n *= 1e6; else if (u === 'B') n *= 1e9; return m[1] ? -n : n; }
  m = t.match(/^([+−-])?([\d,]+(?:\.\d+)?)\s*%$/); if (m) { const n = +m[2].replace(/,/g, '') / 100; return { pct: m[1] === '−' || m[1] === '-' ? -n : n, signed: !!m[1] }; }
  return t;
}
/* KPI boxes picked one by one (2.1.1, 2.1.3 …): consecutive boxes of the same group share one slide */
function kpiGroups(items, all) {
  const byId = new Map(all.map(x => [x.id, x])), out = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (it.kpiSub && last && last.kpi && last.parent === it.parent && last.list.length < 12) { last.list.push(it); continue; }
    out.push(it.kpiSub ? { kpi: true, parent: it.parent, list: [it], head: byId.get(it.parent) } : { it });
  }
  return out;
}
function mergeKpiPicks(items, all) {
  return kpiGroups(items, all).map(g => { if (!g.kpi) return g.it; const h = g.head || g.list[0]; return { id: g.list.length > 1 ? `${g.list[0].id}–${g.list[g.list.length - 1].id.split('.').pop()}` : g.list[0].id, title: g.list.length > 1 ? h.title : g.list[0].title, desc: h.desc || '', page: h.page, blocks: [{ type: 'kpis', items: g.list.flatMap(x => x.blocks[0].items) }], subs: [] }; });
}
/* "As in the studio": every picked chart, table and box is drawn exactly as on screen (light theme) and placed on the slide as a picture;
   tall tables and lists continue on further slides, cut between rows */
async function picturePages(items0, all, kind, o) {
  if (!window.html2canvas) await loadScript(LIB.h2c);
  const ratio = kind === 'pptx' ? 12.3 / 5.35 : 269 / 158, CAP_W = 1180;
  const de = document.documentElement, theme = de.getAttribute('data-theme'); de.setAttribute('data-theme', 'light');
  const root = document.createElement('div'), holder = document.createElement('div');
  root.style.cssText = holder.style.cssText = `position:absolute;left:-40000px;top:0;width:${CAP_W}px;background:#f3f4f6;`;
  holder.className = 'caphold';
  const pages = [], groups = kpiGroups(items0, all);
  let cur = -1, curF = null;
  const keep = { page: NUM.page, n: NUM.n, pending: NUM.pending, subs: NUM.subs, items: NUM.items };
  const draw = (pi) => {
    if (cur === pi) return; cur = pi; const p = PAGES[pi]; numReset(pi); curF = fixRange(filterFor(p.id));
    let h = ''; try { h = withFilter(curF, ANALYSIS_PAGES[p.id]); } catch (e) { console.error(e); }
    root.innerHTML = h.replace(/ data-foldk="[^"]*"/g, '').replace(/ data-lazy="1"/g, '');
    root.querySelectorAll('details').forEach(d => { d.open = true; });
    root.querySelectorAll('details[data-lazyt]').forEach(d => withFilter(curF, () => lazyTableFill(d)));
  };
  const find = id => root.querySelector(`[id="n-${id}"]`) || ([...root.querySelectorAll('.numb')].find(b => b.textContent.trim() === id) || { closest: () => null }).closest('.kpi, .mcard, .section');
  const ign = n => n.tagName === 'BUTTON' || n.tagName === 'SUMMARY' || n.tagName === 'SELECT' || (n.classList && (n.classList.contains('kpi-num') || n.classList.contains('noprint') || (n.classList.contains('sec-head') && n.closest('.caphold > *') === n.parentElement)));
  const colsOf = w0 => (w0 <= CAP_W * 0.4 ? 3 : w0 <= CAP_W * 0.62 ? 2 : 1);
  const shoot = async (nodes, w) => {
    holder.innerHTML = ''; holder.style.width = w + 'px';
    if (nodes.length > 1 || nodes[0].classList.contains('kpi')) { const g = document.createElement('div'); g.className = 'kpis'; g.style.margin = '0'; if (nodes.length < 4) g.style.gridTemplateColumns = `repeat(${nodes.length},minmax(0,1fr))`; nodes.forEach(n => g.appendChild(n.cloneNode(true))); const wrap = document.createElement('div'); wrap.style.padding = '2px'; wrap.appendChild(g); holder.appendChild(wrap); }
    else { const c = nodes[0].cloneNode(true); c.style.margin = '0'; holder.appendChild(c); }
    document.body.appendChild(holder);
    // hide what the picture leaves out (buttons, headings drawn by the slide) before measuring, so the cut lines match the picture
    holder.querySelectorAll('*').forEach(n => { if (ign(n)) n.style.display = 'none'; });
    holder.querySelectorAll('thead th, th').forEach(n => { n.style.position = 'static'; });
    // wide tables: show every column (no scroll bar in a picture) and widen the picture to fit them
    holder.querySelectorAll('.scroll, .scrollbox').forEach(n => { n.style.overflow = 'visible'; n.style.maxHeight = 'none'; });
    { const need = Math.max(0, ...[...holder.querySelectorAll('table')].map(t => t.scrollWidth - t.parentElement.clientWidth)); if (need > 4) holder.style.width = Math.min(2400, w + need + 8) + 'px'; }
    // SVG charts: give every shape its colours and fonts directly (a chart drawn as a picture does not see the page styles)
    holder.querySelectorAll('svg, svg *').forEach(n => { const cs = getComputedStyle(n); if (n.tagName !== 'svg' && n.tagName !== 'title') { n.setAttribute('fill', cs.fill); n.setAttribute('stroke', cs.stroke); if (cs.strokeWidth) n.setAttribute('stroke-width', cs.strokeWidth); } if (n.tagName === 'text' || n.tagName === 'tspan' || n.tagName === 'svg') { n.style.fontFamily = cs.fontFamily; n.style.fontSize = cs.fontSize; n.style.fontWeight = cs.fontWeight; } if (n.tagName === 'svg') { const r = n.getBoundingClientRect(); n.setAttribute('width', r.width); n.setAttribute('height', r.height); } });
    holder.querySelectorAll('.tag.blue').forEach(n => { n.style.background = 'rgba(30,34,170,.14)'; });
    const top0 = holder.getBoundingClientRect().top, H = holder.scrollHeight, W = holder.scrollWidth;
    // where it may be cut: between table rows, bar rows, cards
    // a cut is allowed only where no card, box or chart is split in two (cards side by side must all end above it)
    const whole = [...holder.querySelectorAll('.mcard, .kpi, svg, .hrow, tr')].map(n => { const r = n.getBoundingClientRect(); return [r.top - top0, r.bottom - top0]; });
    const cuts = [...new Set(whole.map(r => Math.round(r[1])))].filter(y => y > 0 && y < H && !whole.some(r => r[0] < y - 2 && r[1] > y + 2)).sort((a, b) => a - b);
    const cv = await window.html2canvas(holder, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, ignoreElements: ign, windowWidth: Math.max(1280, CAP_W + 100) });
    holder.remove();
    // one slide holds a picture up to maxCol high (shrunk to at least 70%); a narrow picture is cut into columns placed side by side on the same slide
    const maxCol = CAP_W / ratio / 0.7, sc = cv.width / W, out = [];
    if (H <= maxCol) { out.push({ data: cv.toDataURL('image/png'), w: W, h: H }); return out; }
    const cols = colsOf(W); let nP = Math.ceil(H / maxCol);
    if (cols > 1 && nP > cols && H / cols <= maxCol * 1.6) nP = cols; // a little smaller so it fits on one slide
    else if (cols > 1 && nP % cols) nP += cols - (nP % cols); // fill every slide's columns evenly
    const target = H / nP, maxPiece = Math.max(maxCol, target * 1.15);
    let y0 = 0;
    while (y0 < H - 2) {
      let y1 = H - y0 <= target * 1.15 ? H : Math.min(H, y0 + target);
      if (y1 < H) { const c = cuts.filter(y => y > y0 + target * 0.5 && y <= Math.min(y0 + maxPiece, y0 + target * 1.15)); if (c.length) { const near = c.reduce((a, y) => (Math.abs(y - y0 - target) < Math.abs(a - y0 - target) ? y : a)); y1 = near; } }
      const part = document.createElement('canvas'); part.width = cv.width; part.height = Math.max(1, Math.round((y1 - y0) * sc));
      const x = part.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, part.width, part.height); x.drawImage(cv, 0, Math.round(y0 * sc), cv.width, part.height, 0, 0, part.width, part.height);
      out.push({ data: part.toDataURL('image/png'), w: W, h: y1 - y0 }); y0 = y1;
    }
    return out;
  };
  try {
    document.body.appendChild(root);
    let k = 0;
    for (const g of groups) {
      k++; setBusy(`Drawing ${k} of ${groups.length} as in the studio`);
      await new Promise(r => setTimeout(r, 0));
      const it = g.kpi ? g.list[0] : g.it, pi = PAGES.findIndex(p => p.name === it.page);
      if (pi < 0 || !ANALYSIS_PAGES[PAGES[pi].id]) { pages.push(...outputPages(expandItem(it, all), o)); continue; }
      draw(pi);
      const els = (g.kpi ? g.list : [it]).map(x => find(x.id)).filter(Boolean);
      if (!els.length) { pages.push(...outputPages(g.kpi ? mergeKpiPicks(g.list, all) : expandItem(it, all), o)); continue; }
      const w = g.kpi ? Math.min(CAP_W, 290 * Math.min(4, els.length) + 20) : Math.max(320, Math.round(els[0].getBoundingClientRect().width));
      const shots = await shoot(els, w);
      const head = g.kpi ? (() => { const h = g.head || it; return { id: g.list.length > 1 ? `${g.list[0].id}–${g.list[g.list.length - 1].id.split('.').pop()}` : g.list[0].id, title: g.list.length > 1 ? h.title : g.list[0].title, desc: h.desc || '', page: h.page }; })() : it;
      // pieces of a narrow chart sit side by side: up to 3 columns on one slide
      const W0 = shots[0] ? shots[0].w : CAP_W, cols = colsOf(W0);
      const groups2 = []; for (let j = 0; j < shots.length; j += cols) groups2.push(shots.slice(j, j + cols));
      groups2.forEach((imgs, j) => pages.push({ it: head, suffix: groups2.length > 1 ? ` · part ${j + 1} of ${groups2.length}` : '', img: imgs[0], imgs }));
    }
  } finally { root.remove(); holder.remove(); if (theme == null) de.removeAttribute('data-theme'); else de.setAttribute('data-theme', theme); Object.assign(NUM, keep); }
  return pages;
}
/* place 1–3 pictures side by side in an area (same scale, never larger than on screen), centred */
function placeImgs(list, AW, AH, gap) {
  const n = list.length, s0 = AW / 1140, maxH = Math.max(...list.map(im => im.h)), sumW = list.reduce((t, im) => t + im.w, 0);
  const sc = Math.min(s0, AH / maxH, (AW - gap * (n - 1)) / sumW), tw = sumW * sc + gap * (n - 1);
  let x = (AW - tw) / 2; return list.map(im => { const r = { im, x, y: 0, w: im.w * sc, h: im.h * sc }; x += r.w + gap; return r; });
}
function buildXlsx(items, meta, o) {
  const X = window.XLSX, wb = X.utils.book_new(), used = new Set();
  const sheetName = it => { let n = (it.id + ' ' + it.title).replace(/[\\/?*\[\]:]/g, ' ').replace(/\s+/g, ' ').slice(0, 31).trim(); let k = 2, b = n; while (used.has(n.toLowerCase())) n = (b.slice(0, 27) + ' (' + k++ + ')'); used.add(n.toLowerCase()); return n; };
  const contents = [[meta.title], [`${meta.period} · ${meta.scope}`], [`Data to ${meta.dataTo} · prepared by ${meta.by || '—'} · ${meta.generated}`], [], ['No.', 'Chart or table', 'Tab', 'Sheet']];
  const sheets = [];
  for (const it of items) {
    const rows = [[`${it.id}  ${it.title}`], [it.page + (it.desc ? ' · ' + it.desc : '')], []], blks = [];
    for (const b of it.blocks || []) {
      const h0 = rows.length;
      if (b.type === 'kpis') { rows.push(['Figure', 'Value', 'Note']); for (const k of b.items) rows.push([k.label, xlNum(k.value), k.note || '']); }
      else if (b.type === 'bars') {
        const st = b.stack || null, s2 = b.series2 || null;
        rows.push(['Item'].concat(st ? st.map(x => x.name || 'Part') : [], s2 ? (b.names || ['A', 'B']) : ['Value'], b.notes ? ['Detail'] : []));
        b.labels.forEach((l, i) => rows.push([l].concat(st ? st.map(x => x.values[i]) : [], s2 ? [b.values[i], s2[i]] : [b.values[i]], b.notes && b.notes[i] ? [[b.notes[i][1], b.notes[i][2]].filter(Boolean).join(' · ')] : [])));
      }
      else if (b.type === 'line') { const ser = b.multi || [{ name: 'Value', values: b.values || [] }]; rows.push(['Period'].concat(ser.map(x => x.name))); b.labels.forEach((l, i) => rows.push([l].concat(ser.map(x => (x.values[i] == null ? '' : x.values[i]))))); }
      else if (b.type === 'table') { const tr = b.full || b.rows; rows.push((b.fullHead || b.head).slice()); for (const r of tr) { const a = r.map((c, j) => (j ? xlNum(c) : c)); if (r._grp) a._grp = true; if (r._total) a._total = true; if (r._bold) a._bold = true; rows.push(a); } }
      else if (b.type === 'text') { for (const x of b.items) rows.push([x]); }
      if (b.type !== 'text' && rows.length > h0) blks.push({ h: h0, n: rows.length - h0 - 1, groups: b.type === 'table' ? b.groups || null : null, bands: b.bands || null });
      rows.push([]);
    }
    const name = sheetName(it); sheets.push([name, rows, blks]); contents.push([it.id, it.title, it.page, name]);
  }
  const mk = (rows, sp) => { const ws = X.utils.aoa_to_sheet(rows.map(r => r.map(c => (c && typeof c === 'object' && 'pct' in c ? c.pct : c && typeof c === 'object' && 'pp' in c ? c.pp * 100 : c)))); if (sp && sp.merges && sp.merges.length) ws['!merges'] = sp.merges;
    // percentages: number format 0.0%
    rows.forEach((r, i) => r.forEach((c, j) => { if (c && typeof c === 'object' && 'pct' in c) { const a = X.utils.encode_cell({ r: i, c: j }); if (ws[a]) ws[a].z = '0.0%'; } else if (typeof c === 'number' && Math.abs(c) >= 1000) { const a = X.utils.encode_cell({ r: i, c: j }); if (ws[a]) ws[a].z = '#,##0'; } }));
    const w = [], hs = new Set((sp && sp.headRows) || []); rows.forEach((r, i) => { if (i < 3) return; r.forEach((c, j) => { const L = hs.has(i) ? Math.min(28, String(c == null ? '' : c).length * 0.7) : String(c && typeof c === 'object' ? '+00.0 pp' : c == null ? '' : c).length; w[j] = Math.min(60, Math.max(w[j] || 8, L + 2)); }); }); ws['!cols'] = w.map(x => ({ wch: x })); return ws; };
  const specs = [];
  if (!o || o.cover !== false) { const sp = sheetSpec(contents, [{ h: 4, n: contents.length - 5 }], { yellowId: true }); X.utils.book_append_sheet(wb, mk(contents, sp), 'Contents'); specs.push(sp); }
  for (const [n, rows, blks] of sheets) { const sp = sheetSpec(rows, blks, { freezeCol: true }); X.utils.book_append_sheet(wb, mk(rows, sp), n); specs.push(sp); }
  const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); blob.specs = specs; return blob;
}
const fmtVal = (v, fmt) => (!Number.isFinite(v) ? '—' : fmt === 'pct' ? pct(v) : fmt === 'int' ? fmtInt(v) : compact(v));
async function buildPptx(pages, items, meta, L, o) {
  const P = new window.PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.title = meta.title; P.company = 'Renault Egypt · EIM'; P.author = meta.by;
  // the Renault template of the After-sales fast report: Inter, capital titles, page number left, "Confidential C" right
  P.theme = { headFontFace: 'Inter', bodyFontFace: 'Inter' };
  const W = 13.333, H = 7.5, INK = '000000', MUT = '888B8D', Y = 'EFDF00', FACE = 'Inter';
  const CF = { catAxisLabelFontFace: FACE, valAxisLabelFontFace: FACE, dataLabelFontFace: FACE, legendFontFace: FACE };
  P.defineSlideMaster({ title: 'CONTENT', background: { color: 'FFFFFF' }, objects: [
    { text: { text: `${meta.period} · ${meta.scope}`, options: { x: 3.0, y: 7.13, w: 7.33, h: 0.26, fontSize: 9, color: MUT, align: 'center', fontFace: FACE } } },
    { text: { text: 'Confidential C', options: { x: W - 2.15, y: 7.13, w: 2.0, h: 0.26, fontSize: 10, color: INK, align: 'right', fontFace: FACE } } },
  ], slideNumber: { x: 0.1, y: 7.13, w: 0.6, h: 0.26, fontSize: 10, color: INK, fontFace: FACE } });
  // cover (can be left out)
  if (o.cover !== false) {
    const cv = P.addSlide(); cv.background = FR_BG.cover ? { data: FR_BG.cover.replace(/^data:/, '') } : { color: INK };
    if (L.white) cv.addImage({ data: L.white, x: 0.55, y: 0.52, h: 1.15, w: 1.15 * L.ratio });
    cv.addText('Egyptian International Motors', { x: 0.27, y: 2.92, w: 9, h: 0.36, fontSize: 17, color: 'FFFFFF', fontFace: FACE, margin: 0 });
    cv.addText(String(meta.title).toUpperCase(), { x: 0.27, y: 3.38, w: 9.5, h: 0.5, fontSize: 28, bold: true, color: 'FFFFFF', fontFace: FACE, margin: 0, fit: 'shrink' });
    cv.addText(meta.period, { x: 0.27, y: 4.04, w: 9.5, h: 0.36, fontSize: 18, color: Y, fontFace: FACE, margin: 0 });
    cv.addText([{ text: `${meta.scope} · data to ${meta.dataTo}`, options: { breakLine: true } }, { text: `${items.length} chart${items.length > 1 ? 's' : ''} and tables · generated ${meta.generated}${meta.by ? ' · prepared by ' + meta.by : ''}` }], { x: 0.27, y: 4.55, w: 9.5, h: 0.5, fontSize: 11, color: 'D9D9D6', fontFace: FACE, margin: 0, valign: 'top' });
  }
  // contents, laid out like the agenda: the number in yellow, the title in capitals
  if (o.contents) {
    chunk(items, 18).forEach((list, k) => {
      const sl = P.addSlide({ masterName: 'CONTENT' });
      sl.addText(k ? 'CONTENTS (CONTINUED)' : 'CONTENTS', { x: 0.26, y: 0.2, w: 9, h: 0.45, fontSize: 20, bold: true, color: INK, fontFace: FACE, margin: 0, valign: 'middle' });
      list.forEach((it, i) => { const col = i < 9 ? 0 : 1, row = col ? i - 9 : i, x = 0.8 + col * 6.2, y = 1.05 + row * 0.64; sl.addText(it.id, { x, y, w: 1.05, h: 0.5, fontSize: 22, color: Y, fontFace: FACE, margin: 0, valign: 'middle' }); sl.addText([{ text: String(it.title).toUpperCase(), options: { bold: true, fontSize: 11.5, color: INK, breakLine: true } }, { text: it.page, options: { fontSize: 8.5, color: MUT } }], { x: x + 1.1, y, w: 4.9, h: 0.5, fontFace: FACE, margin: 0, valign: 'middle', fit: 'shrink' }); });
    });
  }
  for (const pg of pages) {
    const s = P.addSlide({ masterName: 'CONTENT' }), it = pg.it, b = pg.block;
    s.addText([{ text: it.id + '  ', options: { color: Y } }, { text: String(it.title + (pg.suffix || '')).toUpperCase(), options: { color: INK } }], { x: 0.26, y: 0.2, w: 12.8, h: 0.45, fontSize: 20, bold: true, fontFace: FACE, margin: 0, valign: 'middle', fit: 'shrink' });
    if (it.desc) s.addText(it.desc.slice(0, 260), { x: 0.26, y: 0.66, w: 12.0, h: 0.5, fontSize: 11, color: MUT, fontFace: FACE, margin: 0, valign: 'top', fit: 'shrink' });
    const top = 1.3, ch = 5.65;
    if (pg.img) { for (const r of placeImgs(pg.imgs || [pg.img], 12.8, ch, 0.25)) s.addImage({ data: r.im.data, x: 0.26 + r.x, y: top + r.y, w: r.w, h: r.h }); continue; }
    if (b.type === 'empty' || (b.labels && !b.labels.length) || (b.rows && !b.rows.length && b.type === 'table')) { s.addText('No data for this selection.', { x: 0.5, y: 3.4, w: 12.3, h: 0.6, fontSize: 16, color: MUT, align: 'center' }); continue; }
    if (b.type === 'text') { s.addText(b.items.slice(0, 9).map(t => ({ text: t, options: { bullet: { code: '25C6' }, breakLine: true } })), { x: 0.6, y: top, w: 12.1, h: ch, fontSize: b.items.length > 6 ? 12 : 14, color: INK, valign: 'top', paraSpaceAfter: 8 }); continue; }
    if (b.type === 'kpis') {
      b.items.slice(0, 12).forEach((k, i) => {
        const cx = 0.26 + (i % 4) * 3.23, cy = top + Math.floor(i / 4) * 1.88, cw = 3.08, chh = 1.76, no = k.id ? String(k.id) : String(i + 1).padStart(2, '0');
        s.addShape(P.ShapeType.roundRect, { x: cx, y: cy, w: cw, h: chh, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: 'D9D9D6', width: 1 } });
        s.addText([{ text: no + '  ', options: { color: Y, fontSize: 14 } }, { text: k.label.toUpperCase(), options: { color: INK, fontSize: 9.5 } }], { x: cx + 0.18, y: cy + 0.12, w: cw - 0.3, h: 0.34, bold: true, fontFace: FACE, margin: 0, valign: 'middle', fit: 'shrink' });
        s.addText(k.value, { x: cx + 0.18, y: cy + 0.5, w: cw - 0.3, h: 0.46, fontSize: 21, bold: true, color: INK, fontFace: FACE, margin: 0, fit: 'shrink', valign: 'middle' });
        s.addShape(P.ShapeType.line, { x: cx + 0.18, y: cy + 1.04, w: cw - 0.36, h: 0, line: { color: 'E2E2E0', width: 0.5 } });
        s.addText(k.note.slice(0, 130), { x: cx + 0.18, y: cy + 1.1, w: cw - 0.3, h: 0.6, fontSize: 8.5, color: MUT, fontFace: FACE, margin: 0, valign: 'top', fit: 'shrink' });
      });
    } else if (b.type === 'table') {
      const nc = b.head.length, first = Math.min(3.2, 12.3 * 0.3), rest = (12.3 - first) / Math.max(1, nc - 1);
      const hl = { type: 'solid', pt: 0.5, color: 'E8E9EC' }, none = { type: 'none' };
      const rows = [b.head.map((h, i) => ({ text: String(h).toUpperCase(), options: { bold: true, color: INK, fill: { color: 'F7F7F7' }, align: i ? 'right' : 'left', fontSize: nc > 9 ? 6.5 : 7.5, border: [none, none, none, none] } }))].concat(b.rows.map(r => r.map((c, i) => ({ text: cellMain(c, i, nc), options: { align: i ? 'right' : 'left', bold: !!r._total || !i, fill: { color: r._total ? 'FAF8DC' : 'FFFFFF' }, border: [none, none, hl, none] } }))));
      s.addTable(rows, { x: 0.26, y: top, w: 12.8, fontFace: FACE, colW: [first].concat(Array(nc - 1).fill(rest)), fontSize: nc > 12 ? 6.3 : nc > 9 ? 7.2 : 8.5, color: INK, rowH: 0.25, margin: [0.03, 0.08, 0.03, 0.08], autoPage: false });
    } else if (b.type === 'bars') {
      const pctf = b.fmt === 'pct', conv = v => (Number.isFinite(v) ? (pctf ? Math.round(v * 1000) / 10 : Math.round(v)) : 0);
      const data = b.stack ? b.stack.map(sg => ({ name: sg.name, labels: b.labels, values: sg.values.map(conv) })) : [{ name: (b.names && b.names[0]) || 'Revenue', labels: b.labels, values: b.values.map(conv) }];
      if (b.series2) data.push({ name: b.names[1], labels: b.labels, values: b.series2.map(conv) });
      const withNotes = o.notes && b.notes && b.notes.some(n => n[2]);
      const cw = withNotes ? 6.6 : 12.3, nRows = b.labels.length, bh = Math.min(ch, 0.55 + nRows * (b.series2 ? 0.48 : 0.3) + (b.stack || b.series2 ? 0.35 : 0));
      const big = Math.max(0, ...data.flatMap(d => d.values.map(v => Math.abs(v || 0)))), fcode = pctf ? '0.0"%"' : big >= 1e6 ? '#,##0.0,,"M"' : big >= 1e4 ? '#,##0.0,"K"' : '#,##0';
      s.addChart(P.ChartType.bar, data, { ...CF, x: 0.26, y: top, w: cw, h: bh, barDir: 'bar', barGrouping: b.stack ? 'stacked' : 'clustered', barGapWidthPct: b.series2 ? 60 : 45, chartColors: b.stack ? (b.stackColors || OPAL) : b.series2 ? ['EFDF00', '1E22AA'] : ['EFDF00'], catAxisOrientation: 'maxMin', catAxisLabelFontSize: 8.5, catAxisLabelColor: '000000', catAxisLabelFontBold: true, catAxisLineShow: false, valAxisHidden: true, valAxisLineShow: false, valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showValue: true, dataLabelPosition: b.stack ? 'ctr' : 'outEnd', dataLabelFontSize: b.stack ? 6.5 : 7.5, dataLabelFontBold: !b.stack, dataLabelColor: b.stack ? '000000' : '000000', dataLabelFormatCode: fcode, showLegend: !!(b.stack || b.series2), legendPos: 't', legendFontSize: 8, legendColor: MUT });
      if (withNotes) { const hl = { type: 'solid', pt: 0.5, color: 'E8E9EC' }, nb = { type: 'none' }, hd = { fill: { color: 'F1F2F4' }, bold: true, color: MUT, fontSize: 7, border: [nb, nb, nb, nb] }; s.addTable([[{ text: '', options: hd }, { text: 'VALUE', options: Object.assign({ align: 'right' }, hd) }, { text: 'DETAIL', options: hd }]].concat(b.notes.map(n => [{ text: n[0], options: { border: [nb, nb, hl, nb] } }, { text: n[1], options: { align: 'right', bold: true, border: [nb, nb, hl, nb] } }, { text: n[2], options: { color: MUT, border: [nb, nb, hl, nb] } }])), { x: 7.3, y: top, w: 5.5, colW: [1.5, 1.1, 2.9], fontSize: b.notes.length > 11 ? 7 : 7.8, color: INK, rowH: 0.26, margin: [0.02, 0.06, 0.02, 0.06], autoPage: false }); }
    } else if (b.type === 'line') {
      const pctf = b.fmt === 'pct';
      const ser = b.multi.map(m => ({ name: m.name, labels: b.labels, values: m.values.map(v => (v == null ? null : pctf ? Math.round(v * 10000) / 100 : Math.round(v))) }));
      const bigL = Math.max(0, ...ser.flatMap(d => d.values.map(v => Math.abs(v || 0)))), lcode = pctf ? '0.0"%"' : bigL >= 1e6 ? '#,##0.0,,"M"' : bigL >= 1e4 ? '#,##0.0,"K"' : '#,##0';
      s.addChart(P.ChartType.line, ser, { ...CF, x: 0.26, y: top, w: 12.8, h: ch, chartColors: OPAL_L, lineSize: 2.25, lineDataSymbol: 'circle', lineDataSymbolSize: 5, lineDataSymbolLineColor: 'FFFFFF', lineDataSymbolLineSize: 1, catAxisLabelFontSize: 8, catAxisLabelColor: MUT, catAxisLineShow: false, valAxisLabelFontSize: 8, valAxisLabelColor: MUT, valAxisLineShow: false, valGridLine: { color: 'E6E7EA', style: 'dash', size: 0.5 }, valAxisLabelFormatCode: lcode, showLegend: true, legendPos: 't', legendFontSize: 8, legendColor: MUT, displayBlanksAs: 'gap', showValue: b.labels.length <= 13, dataLabelPosition: 't', dataLabelFontSize: 6.5, dataLabelColor: '3A3D40', dataLabelFormatCode: lcode });
    }
  }
  if (o.closing) {
    const e = P.addSlide(); e.background = FR_BG.end ? { data: FR_BG.end.replace(/^data:/, '') } : { color: INK };
    e.addText('THANK YOU', { x: 3.3, y: 3.4, w: 4, h: 0.5, fontSize: 22, bold: true, color: 'FFFFFF', fontFace: FACE, margin: 0, valign: 'middle' });
  }
  return P.write({ outputType: 'blob' });
}
function buildPdf(pages, items, meta, L, o) {
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210, ink = [0, 0, 0], muted = [136, 139, 141], line = [227, 229, 232], blue = [30, 34, 170], yel = [239, 223, 0];
  // the Renault template font (Inter), as in the After-sales fast report
  let FF = 'helvetica'; try { if (window.INTER_TTF) { for (const [st, b64] of Object.entries(window.INTER_TTF)) { doc.addFileToVFS(`Inter-${st}.ttf`, b64); doc.addFont(`Inter-${st}.ttf`, 'Inter', st); } FF = 'Inter'; } } catch (e) { FF = 'helvetica'; }
  const pal = OPAL.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)]);
  const clip = (t, w, fs) => { doc.setFontSize(fs); let s = String(t); while (s.length > 1 && doc.getTextWidth(s) > w) s = s.slice(0, -2) + '…'; return s; };
  let pageNo = 0;
  // page frame of the Renault template: page number left, period in the middle, "Confidential C" right
  const frame = () => {
    pageNo++;
    doc.setFont(FF, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...ink); doc.text(String(pageNo + (o.cover !== false ? 1 : 0)), 3, 205.5);
    doc.text('Confidential C', W - 3.5, 205.5, { align: 'right' });
    doc.setFontSize(7.5); doc.setTextColor(...muted); doc.text(clip(`${meta.period} · ${meta.scope}`, 160, 7.5), W / 2, 205.5, { align: 'center' });
  };
  // heading: the number in yellow, the title in capitals
  const head = (id, title, desc) => {
    doc.setFont(FF, 'bold'); doc.setFontSize(15); doc.setTextColor(...yel); doc.text(id, 6, 13.5); const iw = doc.getTextWidth(id) + 3.5;
    doc.setTextColor(...ink); doc.text(clip(String(title).toUpperCase(), W - 12 - iw, 15), 6 + iw, 13.5);
    if (desc) { doc.setFont(FF, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...muted); doc.text(doc.splitTextToSize(desc.slice(0, 300), 280).slice(0, 2), 6, 21); }
  };
  const bgFull = (img, key) => { if (!img) { doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, H, 'F'); return; } const iw = H * 16 / 9; doc.addImage(img, 'JPEG', W - iw, 0, iw, H, key, 'FAST'); };
  const soft = [241, 242, 244], hair = [232, 233, 236];
  // cover (when it is left out, the first page is removed at the end)
  if (o.cover !== false) {
    bgFull(FR_BG.cover, 'outcover');
    if (L.white) doc.addImage(L.white, 'PNG', 12, 12, 26 * L.ratio, 26);
    doc.setTextColor(255, 255, 255); doc.setFont(FF, 'normal'); doc.setFontSize(17); doc.text('Egyptian International Motors', 6, 78);
    doc.setFont(FF, 'bold'); { const tt = String(meta.title).toUpperCase(); let fz = 28; doc.setFontSize(fz); while (fz > 16 && doc.getTextWidth(tt) > 165) { fz -= 1; doc.setFontSize(fz); } doc.text(clip(tt, 175, fz), 6, 92); }
    doc.setTextColor(...yel); doc.setFont(FF, 'normal'); doc.setFontSize(18); doc.text(clip(meta.period, 200, 18), 6, 105);
    doc.setTextColor(217, 217, 214); doc.setFontSize(10.5); [`${meta.scope} · data to ${meta.dataTo}`, `${items.length} charts and tables · generated ${meta.generated}${meta.by ? ' · prepared by ' + meta.by : ''}`].forEach((t, i) => doc.text(clip(t, 200, 10.5), 6, 116 + i * 6));
  }
  if (o.contents) {
    chunk(items, 18).forEach((list, k) => {
      doc.addPage(); frame(); doc.setTextColor(...ink); doc.setFont(FF, 'bold'); doc.setFontSize(18); doc.text(k ? 'CONTENTS (CONTINUED)' : 'CONTENTS', 6, 14);
      list.forEach((it, i) => { const col = i < 9 ? 0 : 1, row = col ? i - 9 : i, x = 18 + col * 140, y = 36 + row * 17; doc.setFont(FF, 'normal'); doc.setFontSize(19); doc.setTextColor(...yel); doc.text(it.id, x, y); doc.setFont(FF, 'bold'); doc.setFontSize(10.5); doc.setTextColor(...ink); doc.text(clip(String(it.title).toUpperCase(), 100, 10.5), x + 24, y - 2.2); doc.setFont(FF, 'normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); doc.text(clip(it.page, 100, 7.5), x + 24, y + 2.6); });
    });
  }
  const lpal = OPAL_L.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)]);
  for (const pg of pages) {
    doc.addPage(); frame();
    const it = pg.it, b = pg.block; head(it.id, it.title + (pg.suffix || ''), it.desc);
    const box = { x: 6, y: 29, w: 285, h: 168 };
    if (pg.img) { for (const r of placeImgs(pg.imgs || [pg.img], box.w, box.h, 5)) doc.addImage(r.im.data, 'PNG', box.x + r.x, box.y + r.y, r.w, r.h, undefined, 'FAST'); continue; }
    if (b.type === 'empty' || (b.labels && !b.labels.length) || (b.type === 'table' && !b.rows.length)) { doc.setTextColor(...muted); doc.setFontSize(13); doc.text('No data for this selection.', W / 2, 105, { align: 'center' }); continue; }
    if (b.type === 'text') { let yy = 40; doc.setFont(FF, 'normal'); doc.setFontSize(11); doc.setTextColor(...ink); for (const t of b.items.slice(0, 10)) { const ls = doc.splitTextToSize(t, 255); doc.setFillColor(239, 223, 0); doc.rect(16, yy - 2.6, 2.2, 2.2, 'F'); doc.text(ls, 22, yy); yy += ls.length * 5.2 + 3.5; if (yy > 188) break; } continue; }
    if (b.type === 'kpis') {
      b.items.slice(0, 12).forEach((k, i) => { const cx = 6 + (i % 4) * 71.5, cy = 30 + Math.floor(i / 4) * 52; doc.setFillColor(255, 255, 255); doc.setDrawColor(217, 217, 214); doc.setLineWidth(0.35); doc.roundedRect(cx, cy, 68, 48, 2.2, 2.2, 'FD'); doc.setLineWidth(0.2);
        doc.setFont(FF, 'bold'); doc.setFontSize(13); doc.setTextColor(...yel); const no = k.id ? String(k.id) : String(i + 1).padStart(2, '0'); doc.text(no, cx + 4.5, cy + 9.5); const nw = doc.getTextWidth(no) + 3;
        doc.setTextColor(...ink); doc.setFontSize(8.2); doc.text(clip(k.label.toUpperCase(), 62 - nw, 8.2), cx + 4.5 + nw, cy + 9.2);
        doc.setFontSize(17); doc.text(clip(k.value, 60, 17), cx + 4.5, cy + 23);
        doc.setDrawColor(226, 226, 224); doc.line(cx + 4.5, cy + 28, cx + 63.5, cy + 28);
        doc.setFont(FF, 'normal'); doc.setFontSize(7.2); doc.setTextColor(...muted); doc.text(doc.splitTextToSize(k.note, 59).slice(0, 3), cx + 4.5, cy + 33.5); });
    } else if (b.type === 'table') {
      const nc = b.head.length, wide = nc > 9, fs = nc > 12 ? 5.8 : wide ? 6.4 : 7.6, rh = Math.min(7.4, (box.h - 2) / (b.rows.length + (wide ? 2 : 1))), hh = wide ? rh * 2 : rh, first = wide ? 34 : Math.min(70, box.w * 0.28), rest = (box.w - first) / Math.max(1, nc - 1);
      const cx = i => (i === 0 ? box.x : box.x + first + (i - 1) * rest), wOf = i => (i === 0 ? first : rest);
      doc.setFillColor(...soft); doc.roundedRect(box.x, box.y, box.w, hh, 1.5, 1.5, 'F'); doc.setTextColor(...muted); doc.setFont(FF, 'bold');
      b.head.forEach((h, i) => { const t = String(h).toUpperCase(); if (!wide) return doc.text(clip(t, wOf(i) - 2, fs - 0.6), i ? cx(i) + wOf(i) - 1.5 : cx(i) + 2, box.y + rh * 0.64, { align: i ? 'right' : 'left' }); doc.setFontSize(fs - 0.9); const ls = doc.splitTextToSize(t, wOf(i) - 2.5).slice(0, 3); if (ls.length === 3) ls[2] = clip(ls[2], wOf(i) - 2.5, fs - 0.9); const lh = (fs - 0.9) * 0.36, y1 = box.y + hh / 2 - (ls.length - 1) * lh / 2 + lh * 0.35; ls.forEach((l, k) => doc.text(l, i ? cx(i) + wOf(i) - 1.5 : cx(i) + 2, y1 + k * lh, { align: i ? 'right' : 'left' })); });
      doc.setLineWidth(0.15);
      b.rows.forEach((r, ri) => { const y = box.y + hh + rh * ri; if (r._total) { doc.setFillColor(250, 248, 220); doc.rect(box.x, y, box.w, rh, 'F'); } doc.setDrawColor(...hair); doc.line(box.x, y + rh, box.x + box.w, y + rh); doc.setFont(FF, r._total ? 'bold' : 'normal'); r.forEach((c, i) => { doc.setTextColor(...(i ? ink : ink)); doc.setFont(FF, r._total || !i ? 'bold' : 'normal'); doc.text(clip(cellMain(c, i, nc), wOf(i) - 2, fs), i ? cx(i) + wOf(i) - 1.5 : cx(i) + 2, y + rh * 0.64, { align: i ? 'right' : 'left' }); }); });
      doc.setLineWidth(0.2);
    } else if (b.type === 'bars') {
      const withNotes = o.notes && b.notes && b.notes.some(n => n[2]);
      const aw0 = withNotes ? 150 : box.w, lw = withNotes ? 46 : 62, n = b.labels.length, bh = Math.min(7.4, (box.h - 12) / n);
      const tot = i => (b.stack ? b.stack.reduce((t, s2) => t + Math.max(0, s2.values[i] || 0), 0) : Math.max(0, b.values[i] || 0));
      const vw = 24, max = Math.max(...b.labels.map((_, i) => Math.max(tot(i), b.series2 ? Math.max(0, b.series2[i] || 0) : 0, b.marker ? b.marker[i] || 0 : 0)), 1e-9), aw = aw0 - lw - vw - 2;
      const x0 = box.x + lw, rr = (x, y, w, h, c) => { if (w <= 0) return; doc.setFillColor(...c); const r = Math.min(h / 2, w / 2); doc.roundedRect(x, y, w, h, r, r, 'F'); };
      b.labels.forEach((l, i) => {
        const y = box.y + i * bh, hh = b.series2 ? bh * 0.3 : bh * 0.46, y0 = y + (bh - (b.series2 ? hh * 2 + 0.6 : hh)) / 2;
        doc.setFont(FF, 'normal'); doc.setFontSize(7.3); doc.setTextColor(...ink); doc.text(clip(l, lw - 3, 7.3), box.x, y + bh * 0.62);
        rr(x0, y0, aw, hh, soft);
        if (b.stack) { let x = x0; const w0 = tot(i) / max * aw; b.stack.forEach((sg, si) => { const w = Math.max(0, sg.values[i] || 0) / max * aw; if (w > 0) { doc.setFillColor(...(pal[si % pal.length])); doc.rect(x, y0, w, hh, 'F'); const lt = fmtVal(sg.values[i], b.fmt); doc.setFontSize(5.6); doc.setFont(FF, 'bold'); if (w > doc.getTextWidth(lt) + 2.5 && hh >= 2.6) { doc.setTextColor(...(si % pal.length === 0 ? [0, 0, 0] : [255, 255, 255])); doc.text(lt, x + w / 2, y0 + hh * 0.74, { align: 'center' }); } } x += w; });
          void w0; }
        else rr(x0, y0, Math.max(0, b.values[i] || 0) / max * aw, hh, yel);
        if (b.series2) rr(x0, y0 + hh + 0.6, Math.max(0, b.series2[i] || 0) / max * aw, hh, blue);
        if (b.marker && b.marker[i]) { const mx = x0 + b.marker[i] / max * aw; doc.setDrawColor(...ink); doc.setLineWidth(0.55); doc.line(mx, y0 - 0.9, mx, y0 + (b.series2 ? hh * 2 + 0.6 : hh) + 0.9); doc.setLineWidth(0.2); }
        doc.setFont(FF, 'bold'); doc.setFontSize(7.3); doc.setTextColor(...ink); doc.text(fmtVal(b.stack ? tot(i) : b.values[i], b.fmt), x0 + aw + vw, y + bh * 0.62, { align: 'right' });
        if (b.series2) { doc.setFont(FF, 'normal'); doc.setFontSize(6); doc.setTextColor(...muted); doc.text(fmtVal(b.series2[i], b.fmt), x0 + aw + vw, y + bh * 0.62 + 2.6, { align: 'right' }); }
      });
      if (b.stack || b.series2 || b.marker) { const names = (b.stack ? b.stack.map(s2 => s2.name) : b.series2 ? b.names : []).map((nm, si) => [nm, b.stack ? pal[si % pal.length] : (si ? blue : yel)]).concat(b.marker ? [['Target / budget', ink]] : []); let lx = x0; const ly = box.y + n * bh + 4; doc.setFont(FF, 'normal'); doc.setFontSize(7); names.forEach(([nm, c]) => { if (nm === 'Target / budget') { doc.setDrawColor(...c); doc.setLineWidth(0.55); doc.line(lx + 1, ly - 2.4, lx + 1, ly + 0.6); doc.setLineWidth(0.2); } else { doc.setFillColor(...c); doc.circle(lx + 1.3, ly - 0.9, 1.3, 'F'); } doc.setTextColor(...muted); const t = clip(nm || '', 40, 7); doc.text(t, lx + 4, ly); lx += doc.getTextWidth(t) + 10; }); }
      if (withNotes) {
        const tx = box.x + aw0 + 4, tw = box.w - aw0 - 4, rh = Math.min(7.4, (box.h - 8) / (b.notes.length + 1));
        doc.setFillColor(...soft); doc.roundedRect(tx, box.y, tw, rh, 1.5, 1.5, 'F'); doc.setTextColor(...muted); doc.setFont(FF, 'bold'); doc.setFontSize(6.8); doc.text('VALUE', tx + 52, box.y + rh * 0.64, { align: 'right' }); doc.text('DETAIL', tx + 55, box.y + rh * 0.64);
        doc.setLineWidth(0.15); b.notes.forEach((nt, i) => { const y = box.y + rh * (i + 1); doc.setDrawColor(...hair); doc.line(tx, y + rh, tx + tw, y + rh); doc.setTextColor(...ink); doc.setFont(FF, 'normal'); doc.setFontSize(7); doc.text(clip(nt[0], 30, 7), tx + 1, y + rh * 0.66); doc.setFont(FF, 'bold'); doc.text(clip(nt[1], 20, 7), tx + 52, y + rh * 0.66, { align: 'right' }); doc.setFont(FF, 'normal'); doc.setTextColor(...muted); doc.text(clip(nt[2], tw - 57, 6.5), tx + 55, y + rh * 0.66); }); doc.setLineWidth(0.2);
      }
    } else if (b.type === 'line') {
      const ser = b.multi, allv = ser.flatMap(x => x.values).filter(Number.isFinite); if (!allv.length) continue;
      let mn = Math.min(0, ...allv), mx = Math.max(0, ...allv); if (mx === mn) mx = mn + 1; const tk = niceTicks(mn, mx, 5); mn = tk[0]; mx = tk[tk.length - 1];
      const Lx = box.x + 16, R = box.x + box.w - 6, T = box.y + 10, B = box.y + box.h - 12, n2 = b.labels.length;
      const xx = i => Lx + (n2 === 1 ? (R - Lx) / 2 : (i * (R - Lx)) / (n2 - 1)), yy = v => T + ((mx - v) / (mx - mn)) * (B - T), fv = v => (b.fmt === 'pct' ? (v * 100).toFixed(1) + '%' : compact(v));
      // legend on top, small dots
      { let lx = Lx; doc.setFont(FF, 'normal'); doc.setFontSize(7); ser.forEach((se, si) => { const col = lpal[si % lpal.length]; doc.setFillColor(...col); doc.circle(lx + 1.3, box.y + 2.2, 1.3, 'F'); doc.setTextColor(...muted); const t = clip(se.name, 50, 7); doc.text(t, lx + 4, box.y + 3.2); lx += doc.getTextWidth(t) + 10; }); }
      doc.setFontSize(6.5); doc.setLineWidth(0.15); tk.forEach(v => { doc.setDrawColor(...hair); doc.line(Lx, yy(v), R, yy(v)); doc.setTextColor(...muted); doc.text(fv(v), Lx - 2, yy(v) + 1, { align: 'right' }); });
      const every = Math.ceil(n2 / 14); b.labels.forEach((l, i) => { if (i % every && i !== n2 - 1) return; doc.setTextColor(...muted); doc.text(clip(l, 24, 6.5), xx(i), B + 5.5, { align: 'center' }); });
      // soft area under the first series
      { const v0 = ser[0].values, pts = v0.map((v, i) => (Number.isFinite(v) ? [xx(i), yy(v)] : null)).filter(Boolean); if (pts.length > 1 && doc.GState) { try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.09 })); const base = yy(Math.max(mn, 0)); const d = [[pts[0][0], base]].concat(pts, [[pts[pts.length - 1][0], base]]); const rel = d.slice(1).map((p, k) => [p[0] - d[k][0], p[1] - d[k][1]]); doc.setFillColor(...lpal[0]); doc.lines(rel, d[0][0], d[0][1], [1, 1], 'F', true); doc.restoreGraphicsState(); } catch (e) {} } }
      const many = n2 > 13;
      ser.forEach((se, si) => { const col = lpal[si % lpal.length]; doc.setDrawColor(...col); doc.setLineWidth(si ? 0.55 : 0.8); let prev = null; const fin = se.values.map((v, i) => [v, i]).filter(x => Number.isFinite(x[0])); const lastI = fin.length ? fin[fin.length - 1][1] : -1, maxI = fin.length ? fin.reduce((a, x) => (x[0] > a[0] ? x : a))[1] : -1;
        se.values.forEach((v, i) => { if (!Number.isFinite(v)) { prev = null; return; } const p = [xx(i), yy(v)]; if (prev) doc.line(prev[0], prev[1], p[0], p[1]); prev = p; });
        se.values.forEach((v, i) => { if (!Number.isFinite(v)) return; const p = [xx(i), yy(v)]; doc.setFillColor(255, 255, 255); doc.setDrawColor(...col); doc.setLineWidth(0.45); doc.circle(p[0], p[1], 0.9, 'FD');
          const show = (!many && (si === 0 || ser.length <= 2)) || i === lastI || (si === 0 && i === maxI);
          if (show) { doc.setFont(FF, i === lastI ? 'bold' : 'normal'); doc.setFontSize(many ? 5.6 : 6.3); doc.setTextColor(...col); doc.text(fv(v), p[0], p[1] - 2.2, { align: 'center' }); } });
        doc.setLineWidth(0.2); });
    }
  }
  if (o.closing) {
    doc.addPage(); bgFull(FR_BG.end, 'outend');
    doc.setTextColor(255, 255, 255); doc.setFont(FF, 'bold'); doc.setFontSize(22); doc.text('THANK YOU', 74, 98);
  }
  if (o.cover === false && doc.getNumberOfPages() > 1) doc.deletePage(1);
  return doc.output('blob');
}

/* ======================= events ======================= */
function bindDrops() {
  document.querySelectorAll('[data-drop]').forEach(z => {
    if (z._bound) return; z._bound = true;
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', async e => { e.preventDefault(); z.classList.remove('over'); const files = await filesFromDrop(e.dataTransfer); const items = await expandFiles(files, 'upload'); await stageFiles(items, z.dataset.drop); });
  });
}
async function filesFromDrop(dt) {
  const entries = [...(dt.items || [])].map(i => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
  if (!entries.length) return [...dt.files];
  const out = [];
  const walk = async (ent, path) => {
    if (ent.isFile) { const f = await new Promise((res, rej) => ent.file(res, rej)); Object.defineProperty(f, 'webkitRelativePath', { value: path + f.name, configurable: true }); out.push(f); }
    else if (ent.isDirectory) { const rd = ent.createReader(); let batch; do { batch = await new Promise((res, rej) => rd.readEntries(res, rej)); for (const c of batch) await walk(c, path + ent.name + '/'); } while (batch.length); }
  };
  for (const e of entries) await walk(e, '');
  return out;
}
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.psel) { const ps = partSel(); if (t.checked) ps.add(t.dataset.psel); else ps.delete(t.dataset.psel); partSelSave(); if (A.partSelOnly && !ps.size) A.partSelOnly = false; const el = $('psel-n'); if (el) el.innerHTML = `<b>${fmtInt(ps.size)}</b> part number${ps.size === 1 ? '' : 's'} selected`; const o = document.querySelector('[data-act="pselonly"]'); if (o) o.disabled = !ps.size; return; }
  if (t.dataset && t.dataset.act === 'pselonly') { A.partSelOnly = t.checked; render(); return; }
  if (t.dataset && t.dataset.pick) { togglePick(t.dataset.pick, t.checked); return; }
  if (t.matches('input[type=file]')) {
    const files = [...t.files]; const hint = t.dataset.hint, rep = t.dataset.replace || null; t.value = '';
    try { const items = await expandFiles(files, 'upload'); await stageFiles(items, hint, rep); } catch (err) { setBusy(null); toast('Could not read the selection: ' + (err.message || err), true); }
    return;
  }
  if (t.dataset.f) {
    const k = t.dataset.f; A.f[k] = t.type === 'checkbox' ? t.checked : ['s', 'e'].includes(k) ? Number(t.value) : t.value;
    if (k === 'noOW') for (const x in A.fBy) A.fBy[x].noOW = A.f.noOW; // one setting for the whole studio
    if (k === 'branch' && t.value !== 'all') A.chosen.clear();
    try { localStorage.setItem('ps.fBy', JSON.stringify(A.fBy)); } catch (e) {}
    render(); return;
  }
  if (t.dataset.fr) { A.fr[t.dataset.fr] = Number(t.value); if (t.dataset.fr === 'cur') A.fr.prev = null; render(); return; }
  if (t.dataset.out) { const k = t.dataset.out; A.out[k] = t.type === 'checkbox' ? t.checked : t.value; if (k === 'text' || k === 'look') render(); return; }
  if (t.dataset.op) { const st = opState(); st[t.dataset.op] = t.value; st.showAll = false; render(); const el = $('op-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } return; }
  if (t.dataset.cx) { const x = cxDefaults(), [side, k] = t.dataset.cx.split('.'); if (side === 'tab') { x.tab = t.value; } else { x[side][k] = ['s', 'e'].includes(k) ? Number(t.value) : t.value; if (k === 's' && x[side].e < x[side].s) x[side].e = x[side].s; if (k === 'e' && x[side].s > x[side].e) x[side].s = x[side].e; } render(); return; }
  if (t.dataset.pname != null) { const o = Object.assign({}, A.cfg.partNames || {}); const v = t.value.trim(); if (v) o[t.dataset.pname] = v; else delete o[t.dataset.pname]; saveConfig({ partNames: o }, `Part ${t.dataset.pname} name: ${v || '(from the schedule files)'}`, true); return; }
  if (t.dataset.oillink) { A._oilOpen = true; saveConfig({ oilLink: t.value }, 'Oil list: ' + t.options[t.selectedIndex].text, true); render(); return; }
  if (t.dataset.oil) {
    A._oilOpen = true; const [k, f] = t.dataset.oil.split('.'); const l = JSON.parse(JSON.stringify(oilList())); const o = l[k]; if (!o) return;
    const link = A.cfg.oilLink || 'off', v = Math.max(0, Number(t.value) || 0), d0 = o.l > 0 ? o.kg / o.l : 0.91, r4 = x => Math.round(x * 10000) / 10000;
    if (f === 'code') o.code = t.value.trim().toUpperCase();
    else if (f === 'l') { o.l = v; if (link === 'kg') o.kg = r4(v * d0); }
    else if (f === 'kg') { o.kg = v; if (link === 'l' && d0 > 0) o.l = r4(v / d0); }
    else if (f === 'd' || f === 't') { const dn = f === 't' ? (v > 0 ? 1000 / v : 0) : v; if (!(dn > 0)) return render(); if (link === 'l') o.l = r4(o.kg / dn); else o.kg = r4(o.l * dn); }
    saveConfig({ oils: l }, `Oil list: ${o.code} ${f === 'code' ? 'part number' : f === 'l' ? 'litres' : f === 'kg' ? 'kg' : f === 't' ? 'litres per tonne' : 'kg per litre'}`, true); render(); return;
  }
  if (t.dataset.partq != null) { A.partQ = t.value; render(); const el = $('part-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } return; }
  if (t.dataset.cap) { const [unit, k] = t.dataset.cap.split('|'); const cap = JSON.parse(JSON.stringify(A.cfg.capacity || {})); const o = cap[unit] || {}; const v = Math.max(0, Math.round(Number(t.value) || 0)); if (v) o[k] = v; else delete o[k]; if (Object.keys(o).length) cap[unit] = o; else delete cap[unit]; saveConfig({ capacity: cap }, `${unit}: ${k === 'bays' ? 'working bays' : 'technicians'} ${v}`, true); return; }
  if (t.dataset.caph) { const v = Math.min(24, Math.max(1, Number(t.value) || 8)); saveConfig({ capHours: v }, `Available hours per technician per day: ${v}`, true); return; }
  if (t.dataset.cmp) { const k = t.dataset.cmp; A.cmp[k] = /S$|E$/.test(k) ? Number(t.value) : t.value; render(); return; }
  const act = t.dataset.act;
  if (t.dataset.opsel != null || t.dataset.opselall) {
    if (!A.opSel) A.opSel = new Set();
    const boxes = t.dataset.opselall ? [...document.querySelectorAll('[data-opsel]')] : [t];
    for (const x of boxes) { if (t.dataset.opselall) x.checked = t.checked; if (x.checked) A.opSel.add(x.dataset.opsel); else A.opSel.delete(x.dataset.opsel); }
    const n = A.opSel.size, all = A._opMatched ? A._opMatched.length : 0;
    document.querySelectorAll('.op-selinfo').forEach(el => { el.innerHTML = n ? `the <b>${fmtInt(n)}</b> ticked wording${n > 1 ? 's' : ''}` : `all <b>${fmtInt(all)}</b> wordings (tick some to move only those)`; });
    return;
  }
  if (t.dataset.tadj || t.dataset.tadjm) { const y = t.dataset.y, row = t.closest('tr'), mode = row.querySelector('[data-tadj="mode"]').value, pv = Number(row.querySelector('[data-tadj="pct"]').value); const ms = [...row.querySelectorAll('[data-tadjm]')].filter(x => x.checked).map(x => +x.dataset.tadjm); saveTargetAdj(y, mode, mode !== 'none' && !(pv > 0) ? 10 : pv, ms.length ? ms : null); return; }
  if (act === 'modeltop') { const k = t.dataset.k; modelTop()[k] = t.value === '0' ? 0 : Number(t.value) || (TOP_CFG[k] || {}).def || 5; try { localStorage.setItem('ps.topN', JSON.stringify(A.modelTop)); } catch (e) {} render(); return; }
  if (act === 'delallkind' && A.delAll) { if (t.checked) A.delAll.kinds.add(t.value); else A.delAll.kinds.delete(t.value); render(); return; }
  if (act === 'opmonth') { const st = opState(), v = Number(t.value); if (t.checked) st.months.add(v); else st.months.delete(v); render(); return; }
  if (act === 'outpick') { let ids = parseIds(A.out.text); if (t.checked) { if (!ids.includes(t.value)) ids.push(t.value); } else ids = ids.filter(x => x !== t.value); A.out.text = ids.join(', '); render(); return; }
  if (act === 'partsnosvc') { A.partsNoSvc = t.checked; render(); return; }
  if (act === 'partsex') { const ex = partsEx(); if (t.checked) ex.add(t.value); else ex.delete(t.value); render(); return; }
  if (act === 'partcat') { const o = Object.assign({}, A.cfg.partOverride || {}); if (t.value) o[t.dataset.code] = t.value; else delete o[t.dataset.code]; saveConfig({ partOverride: o }, `Part ${t.dataset.code}: ${t.value ? (A.S.partCats.find(c => c.id === t.value) || {}).name : 'back to rules'}`); return; }
  if (act === 'tabcmp') { const pid = PAGES[A.page].id; if (t.value === 'custom') { A.cx = { tab: pid, a: Object.assign({}, A.f), b: shiftFilter(A.f, 'ly') }; A.tabCmp[pid] = 'off'; A.page = PAGES.findIndex(p => p.id === 'compare'); } else A.tabCmp[pid] = t.value; render(); return; }
  if (act === 'advcard') { A.advCard = Number(t.value); render(); return; }
  if (act === 'svcsched') { saveConfig({ servicePartsFromSchedules: t.checked }, `Service parts from schedules: ${t.checked ? 'on' : 'off'}`); return; }
  if (act === 'svcper') { saveConfig({ servicePartsOnPeriodic: t.checked }, `Parts on periodic jobs counted as service: ${t.checked ? 'on' : 'off'}`); return; }
  if (act === 'owsplit') { const set = new Set(A.cfg.owSplits || []); if (t.checked) set.add(t.value); else set.delete(t.value); saveConfig({ owSplits: [...set] }, `One-off warranty RO types: ${[...set].join(', ') || 'none'}`); return; }
  if (act === 'owexsrv') { saveConfig({ owExSrv: t.checked }, `One-off warranty REN_EX_SRV rule: ${t.checked ? 'on' : 'off'}`); return; }
  if (act === 'cmpnopdi') { A.cmp.noPdi = t.checked; render(); return; }
  if (act === 'cmpbr') { if (t.checked) A.cmp.branches.add(t.value); else A.cmp.branches.delete(t.value); render(); return; }
  if (act === 'cmpmonth') { const v = Number(t.value); if (t.checked) A.cmp.months.add(v); else A.cmp.months.delete(v); render(); return; }
  if (act === 'mode') { A.mode = t.value; render(); }
  else if (act === 'pick') { if (t.checked) A.chosen.add(t.value); else A.chosen.delete(t.value); render(); }
  else if (act === 'retq') { A.ret.q = Number(t.value); render(); }
  else if (act === 'rett') { A.ret.type = t.value; render(); }
  else if (act === 'stageact') { A.staging[+t.dataset.i].action = t.value; render(); }
  else if (act === 'stageconfirm') { A.stagingConfirm = t.checked; render(); }
  else if (act === 'drivepick') { A.drive.list[+t.dataset.i].pick = t.checked; render(); }
  else if (act === 'plantmap') { const p = Object.assign({}, A.cfg.plants); if (t.value) p[t.dataset.raw] = t.value; else delete p[t.dataset.raw]; saveConfig({ plants: p }, `Plant ${t.dataset.raw} → ${t.value || 'automatic'}`); }
  else if (act === 'trowmap') { const p = Object.assign({}, A.cfg.targetRows); if (t.value) p[t.dataset.raw] = t.value; else delete p[t.dataset.raw]; saveConfig({ targetRows: p }, `Target row ${t.dataset.raw} → ${t.value === '-' ? 'ignored' : t.value || 'automatic'}`); }
  else if (act === 'modelsched') { const p = Object.assign({}, A.cfg.modelSchedule); if (t.value) p[t.dataset.model] = t.value; else delete p[t.dataset.model]; saveConfig({ modelSchedule: p }, `Model ${t.dataset.model} → ${t.value === '-' ? 'no schedule' : t.value || 'automatic'}`); }
  else if (act === 'tscale') saveConfig({ targetScale: Number(t.value) }, `Target units → ${t.options[t.selectedIndex].text}`);
  else if (act === 'foad') saveConfig({ foadRule: t.checked }, `A.M. Foad at Amerya as BS: ${t.checked ? 'on' : 'off'}`);
  else if (act === 'advname') { const p = Object.assign({}, A.cfg.advisers); p[t.dataset.code] = t.value.trim(); saveConfig({ advisers: p }, `Advisor code ${t.dataset.code} → ${t.value.trim()}`); }
});
document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.delall && A.delAll) { A.delAll.text = t.value; const btn = document.querySelector('[data-act="delallgo"]'); const n = A.imports.filter(d => A.delAll.kinds.has(d.kind)).length; if (btn) btn.disabled = !(t.value.trim().toUpperCase() === 'DELETE' && n); } });
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); finderOpen(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'op-q') { e.preventDefault(); const st = opState(); st.q = e.target.value; st.showAll = false; render(); const el = $('op-q'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } } });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const act = b.dataset.act;
  if (act === 'goto') { A.page = PAGES.findIndex(p => p.id === b.dataset.page); $('sidebar').classList.remove('open'); render(); const t = b.dataset.page === 'data' && $('upload'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); }
  else if (act === 'opedit') { A.opEdit = b.dataset.v; render(); window.scrollTo(0, 0); }
  else if (act === 'opeditcancel') { A.opEdit = null; render(); }
  else if (act === 'opeditsave') {
    const S = A.S, old = A.opEdit, j = S.opJobs.indexOf(old); if (j < 0) return;
    const name = (($('ope-name') || {}).value || '').trim() || old, grp = ($('ope-group') || {}).value || '';
    const al = Object.assign({}, A.cfg.opAlias || {}), ov = Object.assign({}, A.cfg.opOverride || {});
    if (name !== old) { for (const m of S.opMembers[j]) al[m] = name; if (!Object.values(al).includes(old) || !S.opMembers[j].length) al[old] = name; for (const k in al) if (al[k] === old) al[k] = name; delete al[name]; if (ov[old] && !ov[name]) ov[name] = ov[old]; delete ov[old]; }
    if (grp) ov[name] = grp; else delete ov[name];
    A.opEdit = null; if (opState().q === old) opState().q = name;
    saveConfig({ opAlias: al, opOverride: ov }, `Operation “${name}”${name !== old ? ` (was “${old}”)` : ''}${grp ? ' → ' + grp : ''}`);
  }
  else if (act === 'opunmerge') { const al = Object.assign({}, A.cfg.opAlias || {}); delete al[b.dataset.v]; saveConfig({ opAlias: al }, `Wording “${b.dataset.v}” back on its own`); }
  else if (act === 'opungroup') { const ov = Object.assign({}, A.cfg.opOverride || {}); delete ov[b.dataset.v]; saveConfig({ opOverride: ov }, `Operation “${b.dataset.v}” back to the group rules`); }
  else if (act === 'opmergeall') {
    const S = A.S, name = (($('op-mergename') || {}).value || '').trim(); if (!name) { toast('Type the standard name first.', true); return; }
    const al = Object.assign({}, A.cfg.opAlias || {}), ov = Object.assign({}, A.cfg.opOverride || {});
    const targets = A.opSel && A.opSel.size ? [...A.opSel].map(n0 => S.opJobs.indexOf(n0)).filter(j => j >= 0) : (A._opMatched || []);
    let n = 0; for (const j of targets) { const c = S.opJobs[j]; for (const m of S.opMembers[j]) { al[m] = name; n++; } if (c !== name) { al[c] = name; n++; } for (const k in al) if (al[k] === c) al[k] = name; if (ov[c] && !ov[name]) ov[name] = ov[c]; delete ov[c]; }
    delete al[name];
    const wasSel = A.opSel && A.opSel.size; if (A.opSel) A.opSel.clear();
    if (!wasSel) { opState().q = name; opState().group = -1; }
    saveConfig({ opAlias: al, opOverride: ov }, `${n} wording${n > 1 ? 's' : ''} moved to “${name}”`);
  }
  else if (act === 'opgroupall') {
    const S = A.S, g = ($('op-groupall') || {}).value; if (!g) { toast('Choose a group first.', true); return; }
    const targets = A.opSel && A.opSel.size ? [...A.opSel].map(n0 => S.opJobs.indexOf(n0)).filter(j => j >= 0) : (A._opMatched || []);
    const ov = Object.assign({}, A.cfg.opOverride || {}); for (const j of targets) { if (g === '__rule') delete ov[S.opJobs[j]]; else ov[S.opJobs[j]] = g; }
    if (A.opSel) A.opSel.clear();
    saveConfig({ opOverride: ov }, g === '__rule' ? `${targets.length} operations back to the group rules` : `${targets.length} operations moved to ${g}`);
  }
  else if (act === 'partbulk') {
    const v = ($('part-bulk') || {}).value; if (!v) { toast('Choose a category first.', true); return; }
    const o = Object.assign({}, A.cfg.partOverride || {}); for (const code of A._partShown || []) { if (v === '__rule') delete o[code]; else o[code] = v; }
    saveConfig({ partOverride: o }, `${(A._partShown || []).length} part numbers: ${v === '__rule' ? 'back to the rules' : (A.S.partCats.find(c => c.id === v) || {}).name}`);
  }
  else if (act === 'opselclear') { if (A.opSel) A.opSel.clear(); render(); }
  else if (act === 'opsearch') { const st = opState(); st.q = ($('op-q') || {}).value || ''; st.showAll = false; render(); }
  else if (act === 'opgroup') { const st = opState(), v = Number(b.dataset.v); st.group = st.group === v ? -1 : v; st.showAll = false; render(); window.scrollTo(0, 0); }
  else if (act === 'opclear') { const st = opState(); st.q = ''; st.group = -1; st.showAll = false; render(); }
  else if (act === 'opall') { const st = opState(); st.showAll = !st.showAll; render(); }
  else if (act === 'opfind') { const st = opState(); st.q = b.dataset.v; st.group = -1; st.showAll = false; render(); window.scrollTo(0, 0); }
  else if (act === 'ogsave' || act === 'ogadd' || act === 'ogdel' || act === 'ogup' || act === 'ogreset') {
    let list = JSON.parse(JSON.stringify(A.cfg.opGroups && A.cfg.opGroups.length ? A.cfg.opGroups : C.DEFAULT_OP_GROUPS()));
    let routine = A.cfg.opRoutine || '';
    document.querySelectorAll('[data-og]').forEach(el => { if (el.dataset.og === 'routine') { routine = el.value.trim(); return; } const [k, field] = el.dataset.og.split('.'); if (list[+k]) list[+k][field] = el.value.trim(); });
    const bad = list.find(g => g.pattern && !C.safeRe(g.pattern)) || (routine && !C.safeRe(routine) ? { name: 'Routine add-ons' } : null);
    if (bad) { toast(`The words for "${bad.name}" are not valid. Check brackets and special characters.`, true); return; }
    const i = Number(b.dataset.i);
    if (act === 'ogadd') list.push({ name: 'New group', pattern: '' });
    if (act === 'ogdel') list.splice(i, 1);
    if (act === 'ogup' && i > 0) { const t2 = list[i - 1]; list[i - 1] = list[i]; list[i] = t2; }
    if (act === 'ogreset') list = C.DEFAULT_OP_GROUPS();
    saveConfig({ opGroups: list.filter(g => g.name), opRoutine: routine }, 'Operation groups');
  }
  else if (act === 'cxpreset') { const x = cxDefaults(), v = b.dataset.v; if (v === 'prev' || v === 'ly') x.b = shiftFilter(x.a, v); else if (v === 'same') x.b = Object.assign({}, x.a); else if (v === 'swap') { const t2 = x.a; x.a = x.b; x.b = t2; } render(); }
  else if (act === 'partcatdel') { const o = Object.assign({}, A.cfg.partOverride || {}); delete o[b.dataset.code]; saveConfig({ partOverride: o }, `Part ${b.dataset.code}: back to rules`); }
  else if (act === 'oiladd' || act === 'oildel' || act === 'oilreset') {
    let l = JSON.parse(JSON.stringify(oilList()));
    if (act === 'oiladd') l.push({ code: 'LO-', l: 1, kg: 0.9 }); else if (act === 'oildel') l.splice(Number(b.dataset.k), 1); else l = JSON.parse(JSON.stringify(OIL_DEFAULT));
    if (!l.length) l = JSON.parse(JSON.stringify(OIL_DEFAULT));
    A._oilOpen = true; saveConfig({ oils: l }, act === 'oiladd' ? 'Oil added' : act === 'oildel' ? 'Oil removed' : 'Oil list reset', true); render();
  }
  else if (act === 'pcsave' || act === 'pcadd' || act === 'pcdel' || act === 'pcup') {
    const list = JSON.parse(JSON.stringify(A.cfg.partCats || []));
    document.querySelectorAll('[data-pc]').forEach(el => { const [k, field] = el.dataset.pc.split('.'); const c = list[+k]; if (!c) return; if (field === 'prefixes' || field === 'jobsSkip') c[field] = el.value.split(',').map(x => x.trim().toUpperCase()).filter(Boolean); else c[field] = el.value.trim(); });
    const bad = list.find(c => (c.pattern && !C.safeRe(c.pattern)) || (c.jobs && !C.safeRe(c.jobs)));
    if (bad) { toast(`The pattern for "${bad.name}" is not valid. Check brackets and special characters.`, true); return; }
    const i = Number(b.dataset.i);
    if (act === 'pcadd') list.push({ id: 'cat' + Date.now().toString(36), name: 'New category', prefixes: [], pattern: '', jobs: '', jobsSkip: [] });
    if (act === 'pcdel') { const gone = list.splice(i, 1)[0]; if (gone) { const o = Object.assign({}, A.cfg.partOverride || {}); for (const k in o) if (o[k] === gone.id) delete o[k]; A.cfg.partOverride = o; } }
    if (act === 'pcup' && i > 0) { const t2 = list[i - 1]; list[i - 1] = list[i]; list[i] = t2; }
    saveConfig({ partCats: list, partOverride: A.cfg.partOverride || {} }, act === 'pcadd' ? 'Part category added' : act === 'pcdel' ? 'Part category removed' : 'Part category rules');
  }
  else if (act === 'reset') { const S = A.S; A.f.e = C.ymOf(S.maxDay); A.f.s = A.f.e; A.f.group = 'month'; A.f.branch = 'all'; A.f.act = 'all'; A.f.pay = 'all'; A.mode = 'combined'; A.chosen.clear(); A.tabCmp[PAGES[A.page].id] = 'off'; render(); }
  else if (act === 'fall') { for (const p of PAGES) { const g = A.fBy[p.id]; A.fBy[p.id] = Object.assign({}, A.f, g ? { group: g.group } : {}); } A.f = A.fBy[PAGES[A.page].id]; try { localStorage.setItem('ps.fBy', JSON.stringify(A.fBy)); } catch (e) {} toast('This period, branch, activity and payer now apply to every tab.'); render(); }
  else if (act === 'gran') { A.trendGran = b.dataset.v; render(); }
  else if (act === 'outpptx') exportOutput('pptx');
  else if (act === 'outpdf') exportOutput('pdf');
  else if (act === 'outxlsx') exportOutput('xlsx');
  else if (act === 'outclear') { A.out.text = ''; render(); }
  else if (act === 'pickclear') { A.out.text = ''; saveOutText(); syncPicks(); }
  else if (act === 'qsave') {
    const nm = (($('q-name') || {}).value || '').trim(), ids = parseIds(A.out.text), mode = ($('q-mode') || {}).value || 'current';
    if (!nm) { toast('Give the printout a name.', true); return; } if (!ids.length) return;
    const rec = { name: nm, mode, ids: ids.join(', '), text: ids.join(', '), f: Object.assign({}, A.f), title: A.out.title, period: `${ymLbl(A.f.s)}–${ymLbl(A.f.e)} · ${scopeText()}`, partsNoSvc: A.partsNoSvc, createdAt: Date.now() };
    if (isAdmin() && ($('q-team') || {}).checked) {
      const v = Object.assign({}, rec, { by: A.myId || null }); delete v.ids; const id = 'v-' + nm.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      if (A.local) A.views = (A.views || []).filter(x => x.id !== id).concat([Object.assign({ id }, v)]);
      else { try { await A.caps.db.collection('views').doc(id).set(JSON.parse(JSON.stringify(v))); audit('View saved', nm); } catch (e) { toast('Sharing with the team failed: ' + (e.message || e.code || e), true); return; } }
    } else { const l = quickList(); l.push(Object.assign({ id: 'q' + Date.now().toString(36) }, rec)); quickSave(l); }
    toast(`Saved “${nm}” (${ids.length} item${ids.length > 1 ? 's' : ''}).`); render(); }
  else if (act === 'qload' || act === 'qpptx' || act === 'qpdf') {
    const q = b.dataset.team ? (A.views || []).find(x => x.id === b.dataset.id) : quickList().find(x => x.id === b.dataset.id); if (!q) return;
    if (['latest', 'ytd', 'fixed'].includes(q.mode)) applyView(Object.assign({}, q, { text: q.ids || q.text })); else A.out.text = q.ids || q.text || '';
    A.qEdit = null; saveOutText(); render();
    if (act === 'qload') { toast(`“${q.name}” loaded: ${parseIds(A.out.text).length} items. Press PowerPoint, PDF or Excel.`); setTimeout(() => { const el = $('out-build'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }
    else exportOutput(act === 'qpptx' ? 'pptx' : 'pdf'); }
  else if (act === 'qedit') { A.qEdit = b.dataset.id; render(); setTimeout(() => { const el = $('q-rename'); if (el) { el.focus(); el.select(); } }, 30); }
  else if (act === 'qrename' || act === 'qupdate' || act === 'qdel') {
    const team = !!b.dataset.team, id = b.dataset.id, ids = parseIds(A.out.text), nm = (($('q-rename') || {}).value || '').trim();
    if (team) {
      const v = (A.views || []).find(x => x.id === id); if (!v) return;
      const patch = act === 'qrename' ? { name: nm || v.name } : act === 'qupdate' ? { text: ids.join(', ') } : null;
      if (A.local) { if (patch) Object.assign(v, patch); else A.views = A.views.filter(x => x.id !== id); }
      else { try { const d = A.caps.db.collection('views').doc(id); if (patch) await d.set(JSON.parse(JSON.stringify(Object.assign({}, v, patch, { id: undefined })))); else await d.delete(); } catch (e) { toast('Could not change the team printout: ' + (e.message || e.code || e), true); } }
    } else {
      let l = quickList(); const q = l.find(x => x.id === id);
      if (act === 'qdel') l = l.filter(x => x.id !== id); else if (q && act === 'qrename' && nm) q.name = nm; else if (q && act === 'qupdate' && ids.length) { q.ids = q.text = ids.join(', '); q.f = Object.assign({}, A.f); }
      quickSave(l);
    }
    A.qEdit = null; render(); }
  else if (act === 'finder') finderOpen();
  else if (act === 'finderclose') finderClose();
  else if (act === 'findergo') finderGo(+b.dataset.pg, b.dataset.id);
  else if (act === 'outgo') { const el = $('out-build'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  else if (act === 'outall') { A.out.text = collectCatalog().filter(x => !x.parent && !OUT_SKIP.includes(x.page)).map(x => x.id).join(', '); render(); }
  else if (act === 'outtaball' || act === 'outtabclear') { const tab = collectCatalog().filter(x => x.page === b.dataset.pg); const tabIds = new Set(tab.map(x => x.id)); let ids = parseIds(A.out.text).filter(x => !tabIds.has(x)); if (act === 'outtaball') { const all = collectCatalog().filter(x => !x.parent).map(x => x.id), want = new Set(ids.concat(tab.filter(x => !x.parent).map(x => x.id))); ids = all.filter(x => want.has(x)).concat(ids.filter(x => !all.includes(x))); } A.out.text = ids.join(', '); render(); }
  else if (act === 'partsxlsx') partsXlsx();
  else if (act === 'pselall') { const ps = partSel(); (A._partFound0 || []).forEach(c => ps.add(c)); partSelSave(); render(); }
  else if (act === 'pselclear') { partSel().clear(); partSelSave(); A.partSelOnly = false; render(); }
  else if (act === 'advupload') { const f = $('adv-file'); if (f) { f.value = ''; f.onchange = () => { if (f.files && f.files[0]) uploadAdvisorIds(f.files[0]); }; f.click(); } }
  else if (act === 'pnupload') { const f = $('pn-file'); if (f) { f.value = ''; f.onchange = () => { if (f.files && f.files[0]) uploadPartNames(f.files[0]); }; f.click(); } }
  else if (act === 'partscsv') { const m = A._partsCsv || []; csvSave(`Parts ${ymLbl(A.f.s)}-${ymLbl(A.f.e)}.csv`, ['Part number', 'Name', 'Category', 'Revenue', 'Units', 'RO lines', 'Avg price', 'Discount', 'Discount rate'], m.map(x => [x.code, partName(x.code), catName(A.S, x.cat), Math.round(x.s2.net), Math.round(x.s2.qty * 100) / 100, x.s2.ros, Math.round(x.s2.avgPrice), Math.round(x.s2.disc), (x.s2.rate * 100).toFixed(2) + '%'])); }
  else if (act === 'lostcsv') { const S = A.S, d = A._lostCsv || { lost: [], risk: [] }; csvSave(`Lapsed vehicles ${dayLbl(S.maxDay)}.csv`, ['Status', 'VIN', 'Model', 'Last branch', 'Last advisor', 'Last visit', 'Visits', 'Spend EGP'], d.lost.map(o => ['Lapsed 12-24 months', S.vins[o.v], S.models[o.model], S.branches[o.br], S.advs[o.adv], dayLbl(o.day), o.visits.size, Math.round(o.spend)]).concat(d.risk.map(o => ['At risk 9-12 months', S.vins[o.v], S.models[o.model], S.branches[o.br], S.advs[o.adv], dayLbl(o.day), o.visits.size, Math.round(o.spend)]))); }
  else if (act === 'svcsave') { const pre = $('svc-pre').value.split(',').map(x => x.trim().toUpperCase()).filter(Boolean); const add = $('svc-add').value.trim().toUpperCase(); const list = new Set(A.cfg.serviceParts || []); if (add) list.add(add); saveConfig({ servicePartPrefixes: pre, serviceParts: [...list] }, `Service-part rules: prefixes ${pre.join(', ') || 'none'}${add ? ' · added ' + add : ''}`); }
  else if (act === 'svcdel') { const list = (A.cfg.serviceParts || []).filter(x => x !== b.dataset.code); saveConfig({ serviceParts: list }, `Removed service part ${b.dataset.code}`); }
  else if (act === 'alsave') { const g = k => Number($('al-' + k).value) / 100; saveConfig({ alerts: { achBelow: g('achBelow'), partsAchBelow: g('partsAchBelow'), discRate: g('discRate'), advDiscRate: g('advDiscRate'), revRoDrop: g('revRoDrop') } }, 'Alert thresholds'); }
  else if (act === 'owthr') { const v = Number($('ow-thr').value); if (!(v > 0)) { toast('Enter a threshold above zero.', true); return; } saveConfig({ owThreshold: v }, `One-off warranty threshold: EGP ${fmtInt(v)}`); }
  else if (act === 'owpayer') { const v = $('ow-payer').value.trim(); if (v && !C.safeRe(v)) { toast('The payer pattern is not a valid regular expression.', true); return; } saveConfig({ owPayerRe: v }, `One-off warranty payer pattern: ${v || 'none'}`); }
  else if (act === 'viewsave') { const name = $('view-name').value.trim(); if (!name) { toast('Give the view a name.', true); return; } const v = { name, mode: $('view-mode').value, f: Object.assign({}, A.f), text: A.out.text, title: A.out.title, advScope: A.advScope, partsNoSvc: A.partsNoSvc, period: `${ymLbl(A.f.s)}–${ymLbl(A.f.e)} · ${scopeText()}`, createdAt: Date.now(), by: A.myId || null }; const id = 'v-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60); if (A.local) { A.views = A.views.filter(x => x.id !== id).concat([Object.assign({ id }, v)]); render(); } else { try { await A.caps.db.collection('views').doc(id).set(JSON.parse(JSON.stringify(v))); toast('View saved'); audit('View saved', name); } catch (err) { toast('Could not save the view: ' + (err.message || err.code), true); } } }
  else if (act === 'viewload' || act === 'viewpptx' || act === 'viewpdf') { const v = A.views.find(x => x.id === b.dataset.id); if (!v) return; applyView(v); render(); if (act !== 'viewload') exportOutput(act === 'viewpptx' ? 'pptx' : 'pdf'); }
  else if (act === 'viewdel') { if (A.local) { A.views = A.views.filter(x => x.id !== b.dataset.id); render(); } else { try { await A.caps.db.collection('views').doc(b.dataset.id).delete(); } catch (err) { toast('Could not delete: ' + (err.message || err.code), true); } } }
  else if (act === 'frn') { A.fr.n = b.dataset.v === 'ytd' ? 'ytd' : Number(b.dataset.v); A.fr.prev = null; render(); }
  else if (act === 'frstyle') { A.fr.style = b.dataset.v; render(); }
  else if (act === 'frpptx') exportFastReport('pptx');
  else if (act === 'frpdf') exportFastReport('pdf');
  else if (act === 'vtpdim') { A.vtpDim = b.dataset.v; render(); }
  else if (act === 'vtpxlsx') exportVtpXlsx();
  else if (act === 'advscope') { A.advScope = b.dataset.v; render(); }
  else if (act === 'cmpmode') { A.cmp.mode = b.dataset.v; render(); }
  else if (act === 'cmptype') { A.cmp.ptype = b.dataset.v; A.cmp.a = A.cmp.b = null; render(); }
  else if (act === 'cmpbrall') { A.cmp.branches = new Set(branchNames()); render(); }
  else if (act === 'cmpbrnone') { A.cmp.branches.clear(); render(); }
  else if (act === 'pickclear') { A.chosen.clear(); render(); }
  else if (act === 'fu') { A.fuStatus = b.dataset.v; render(); }
  else if (act === 'modelsall') { A.modelsAll = !A.modelsAll; render(); }
  else if (act === 'stageclear') { A.staging = []; A.stagingConfirm = false; render(); }
  else if (act === 'stagesave') saveStaging();
  else if (act === 'delallopen') { A.delAll = { open: true, kinds: new Set(['txn', 'target', 'schedule']), text: '' }; render(); }
  else if (act === 'delallcancel') { A.delAll = null; render(); }
  else if (act === 'partssort') { A.partsSort = b.dataset.v; try { localStorage.setItem('ps.partsSort', A.partsSort); } catch (e) {} render(); }
  else if (act === 'cwsort') { A.cwSort = b.dataset.v; try { localStorage.setItem('ps.cwSort', A.cwSort); } catch (e) {} render(); }
  else if (act === 'tadjdet') { saveTargetAdj(b.dataset.y, 'remove', Number(b.dataset.p) || 10, b.dataset.m.split(',').map(Number)); }
  else if (act === 'delallgo') { if (A.delAll && A.delAll.text.trim().toUpperCase() === 'DELETE') deleteAllImports(); }
  else if (act === 'del') { A.confirmDel = b.dataset.id; render(); }
  else if (act === 'delcancel') { A.confirmDel = null; render(); }
  else if (act === 'delconfirm') deleteImport(b.dataset.id);
  else if (act === 'edittarget') { A.editTarget = b.dataset.id; render(); }
  else if (act === 'canceltarget') { A.editTarget = null; render(); }
  else if (act === 'savetarget') saveTargetEdit(b.dataset.id);
  else if (act === 'drivecheck') driveCheck();
  else if (act === 'drivefetch') driveFetch();
  else if (act === 'advdel') { const p = Object.assign({}, A.cfg.advisers); delete p[b.dataset.code]; saveConfig({ advisers: p }, `Removed advisor code ${b.dataset.code}`); }
  else if (act === 'advadd') { const c = $('adv-code').value.trim(), n = $('adv-name').value.trim(); if (!/^\d+$/.test(c) || !n) { toast('Enter a numeric code and a name.', true); return; } const p = Object.assign({}, A.cfg.advisers, { [c]: n }); saveConfig({ advisers: p }, `Advisor code ${c} → ${n}`); }
  else if (act === 'rulesave') { const inc = $('rule-inc').value, exc = $('rule-exc').value; if (inc && !C.safeRe(inc)) { toast('The include pattern is not a valid regular expression.', true); return; } if (exc && !C.safeRe(exc)) { toast('The exclude pattern is not a valid regular expression.', true); return; } saveConfig({ periodicInclude: inc, periodicExclude: exc }, 'Periodic-maintenance rules'); }
  else if (act === 'memsearch') { try { A.memHits = (await A.caps.user.search($('mem-q').value.trim())) || []; A.memPick = null; } catch (err) { A.memHits = []; toast('Search is not available: ' + (err.message || err.code), true); } render(); }
  else if (act === 'mempick') { A.memPick = +b.dataset.i; render(); }
  else if (act === 'memadd') {
    const p = A.memHits[A.memPick]; if (!p) return; const scope = [...document.querySelectorAll('.mem-br:checked')].map(x => x.value);
    try { await A.caps.db.collection('members').doc('m-' + String(p.id).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 150)).set({ uid: p.id, scope, addedAt: Date.now() }); A.names.set(p.id, p.name || ''); await audit('Member scope set', `${p.name || 'Member'}: ${scope.length ? scope.join(', ') : 'full network'}`); A.memHits = []; A.memPick = null; toast('Member scope saved'); } catch (err) { toast('Could not save member: ' + (err.message || err.code), true); }
  }
  else if (act === 'memdel') { try { await A.caps.db.collection('members').doc(b.dataset.id).delete(); await audit('Member removed', b.dataset.id); } catch (err) { toast('Could not remove: ' + (err.message || err.code), true); } }
  else if (act === 'pptx') exportPptx(deckData());
  else if (act === 'pdf') exportPdf(deckData());
  else if (act === 'trendpdf') exportPdf(trendsData());
  else if (act === 'fucsv') exportFollowupCsv();
});

/* ======================= boot ======================= */
const NAV_GROUPS = { compare: 'Summary', ops: 'Analysis', customers: 'Customers', output: 'Reports & settings' };
PAGES.forEach((p, i) => { if (NAV_GROUPS[p.id]) { const g = document.createElement('div'); g.className = 'navgrp'; g.textContent = NAV_GROUPS[p.id]; $('nav').appendChild(g); } const b = document.createElement('button'); b.title = `Tab ${i + 1} — chart numbers start with ${i + 1}.`; b.innerHTML = `<span class="ico" aria-hidden="true">${p.ico}</span>${esc(p.name)}<span class="tno">${i + 1}</span>`; b.onclick = () => { A.page = i; try { localStorage.setItem('ps.page', p.id); } catch (e) {} $('sidebar').classList.remove('open'); render(); window.scrollTo(0, 0); }; $('nav').appendChild(b); });
$('menu').onclick = () => $('sidebar').classList.toggle('open');
render();
initCloud();
